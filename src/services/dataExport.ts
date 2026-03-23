import { db } from '@/db/database'

interface ExportData {
  version: 1
  exportedAt: string
  books: unknown[]
  chapters: unknown[]
  words: unknown[]
}

export async function exportAllData(): Promise<void> {
  const [books, chapters, words] = await Promise.all([
    db.books.toArray(),
    db.chapters.toArray(),
    db.words.toArray(),
  ])

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    chapters,
    words,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lesen-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importData(file: File): Promise<{ books: number; words: number }> {
  const text = await file.text()
  const data: ExportData = JSON.parse(text)

  if (data.version !== 1) {
    throw new Error('Unsupported backup version')
  }

  // Clear existing data
  await db.transaction('rw', db.books, db.chapters, db.words, async () => {
    await db.books.clear()
    await db.chapters.clear()
    await db.words.clear()

    if (data.books.length) await db.books.bulkAdd(data.books as never[])
    if (data.chapters.length) await db.chapters.bulkAdd(data.chapters as never[])
    if (data.words.length) await db.words.bulkAdd(data.words as never[])
  })

  return { books: data.books.length, words: data.words.length }
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.books, db.chapters, db.words, async () => {
    await db.books.clear()
    await db.chapters.clear()
    await db.words.clear()
  })
}
