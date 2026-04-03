import { db, type Book, type BookType, type Chapter, type Word, type Language } from '@/db/database'
import { getLemma, initLemmatizer } from '@/services/lemmatizer'
import { extractUniqueWords, countWords, isNumber } from '@/services/textProcessor'

function getDefaultChapterSize(): number {
  return Number(localStorage.getItem('lesen-chapter-size')) || 3000
}

interface ImportOptions {
  title: string
  text: string
  coverUrl?: string
  language?: Language
  type?: BookType
  chapterSize?: number
  /** Pre-split chapters (e.g. from EPUB). If provided, text splitting is skipped. */
  preChapters?: { title: string; content: string }[]
}

export async function importBook(options: ImportOptions): Promise<number> {
  const { title, text, coverUrl, language = 'de', type = 'book', chapterSize = getDefaultChapterSize(), preChapters } = options

  // Ensure lemmatizer is loaded for this language
  await initLemmatizer(language)

  const chapters = preChapters
    ? preChapters.map(c => ({ title: c.title, content: c.content }))
    : splitIntoChapters(text, chapterSize).map((content, i) => ({
        title: `Chapter ${i + 1}`,
        content,
      }))

  const allText = chapters.map(c => c.content).join('\n\n')
  const allUniqueWords = extractUniqueWords(allText)
  const totalWordCount = countWords(allText)

  // Create book
  const bookId = await db.books.add({
    title,
    coverUrl,
    language,
    type,
    archived: false,
    totalWords: totalWordCount,
    uniqueWords: allUniqueWords.length,
    createdAt: new Date(),
    lastOpenedAt: new Date(),
  } as Book)

  // Create chapters
  const chapterRecords: Omit<Chapter, 'id'>[] = chapters.map((ch, i) => ({
    bookId: bookId as number,
    title: ch.title,
    orderIndex: i,
    content: ch.content,
    wordCount: countWords(ch.content),
  }))

  await db.chapters.bulkAdd(chapterRecords as Chapter[])

  // Create/update word records
  await processWords(allUniqueWords, bookId as number, language)

  return bookId as number
}

function splitIntoChapters(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const chapters: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length > maxSize && current.length > 0) {
      chapters.push(current.trim())
      current = ''
    }
    current += (current ? '\n\n' : '') + para.trim()
  }

  if (current.trim()) {
    chapters.push(current.trim())
  }

  // If no paragraph breaks produced chapters, force-split
  if (chapters.length === 0 && text.trim()) {
    chapters.push(text.trim())
  }

  return chapters
}

async function processWords(uniqueWords: string[], bookId: number, language: Language = 'de'): Promise<void> {
  const now = new Date()

  // Batch lookup existing words
  const existingWords = await db.words.where('text').anyOf(uniqueWords).toArray()
  const existingMap = new Map(existingWords.map(w => [w.text, w]))

  const toAdd: Omit<Word, 'id'>[] = []
  const toUpdate: { id: number; changes: Partial<Word> }[] = []

  for (const wordText of uniqueWords) {
    const existing = existingMap.get(wordText)

    if (existing) {
      // Add bookId if not already there
      if (!existing.bookIds.includes(bookId)) {
        toUpdate.push({
          id: existing.id,
          changes: {
            bookIds: [...existing.bookIds, bookId],
            updatedAt: now,
          },
        })
      }
    } else {
      const lemma = getLemma(wordText, language)
      const level = isNumber(wordText) ? 'ignored' as const : 'new' as const

      toAdd.push({
        text: wordText,
        lemma,
        level,
        bookIds: [bookId],
        lookupCount: 0,
        reviewStreak: 0,
        createdAt: now,
        updatedAt: now,
      } as Word)
    }
  }

  if (toAdd.length > 0) {
    await db.words.bulkAdd(toAdd as Word[])
  }

  for (const { id, changes } of toUpdate) {
    await db.words.update(id, changes)
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function resizeImage(file: File, maxWidth = 240, maxHeight = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')

      let { width, height } = img
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}
