import Dexie, { type EntityTable } from 'dexie'

export type Language = 'de' | 'af' | 'ru' | 'ar'

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'af', label: 'Afrikaans', flag: '🇿🇦' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
]

export type BookType = 'book' | 'text'

export interface Book {
  id: number
  title: string
  coverUrl?: string
  language: Language
  type: BookType
  archived: boolean
  totalWords: number
  uniqueWords: number
  createdAt: Date
  lastOpenedAt: Date
  lastChapterId?: number
  scrollPosition?: number
  lastPage?: number
}

export interface Chapter {
  id: number
  bookId: number
  title: string
  orderIndex: number
  content: string
  wordCount: number
}

export interface Word {
  id: number
  text: string
  lemma: string
  translation?: string
  level: 'new' | 'learning' | 'known' | 'ignored'
  bookIds: number[]
  lookupCount: number
  lastLookedUp?: Date
  reviewStreak: number
  lastReviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CachedExercise {
  id: number
  lemma: string
  sentence: string
  blanked: string
  translation: string
  distractors: string[]
  used: boolean
  createdAt: Date
}

const db = new Dexie('LesenDB') as Dexie & {
  books: EntityTable<Book, 'id'>
  chapters: EntityTable<Chapter, 'id'>
  words: EntityTable<Word, 'id'>
  exercises: EntityTable<CachedExercise, 'id'>
}

db.version(1).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
})

db.version(2).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
}).upgrade(tx => {
  return tx.table('words').toCollection().modify(word => {
    if (word.reviewStreak === undefined) word.reviewStreak = 0
  })
})

db.version(3).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
}).upgrade(tx => {
  return tx.table('books').toCollection().modify(book => {
    if (!book.language) book.language = 'de'
  })
})

db.version(4).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
}).upgrade(tx => {
  return tx.table('books').toCollection().modify(book => {
    if (book.type === undefined) book.type = 'book'
    if (book.archived === undefined) book.archived = false
  })
})

db.version(5).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
  exercises: '++id, &lemma, used',
})

db.version(6).stores({
  books: '++id, title, lastOpenedAt',
  chapters: '++id, bookId, orderIndex',
  words: '++id, &text, lemma, level, *bookIds',
  exercises: '++id, &lemma, used',
}).upgrade(async tx => {
  // Clean up stale bookIds referencing deleted books
  const bookIds = new Set((await tx.table('books').toArray()).map((b: Book) => b.id))
  await tx.table('words').toCollection().modify((word: Word) => {
    const cleaned = word.bookIds.filter(id => bookIds.has(id))
    if (cleaned.length !== word.bookIds.length) {
      word.bookIds = cleaned
    }
  })
})

export { db }
