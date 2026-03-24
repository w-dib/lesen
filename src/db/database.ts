import Dexie, { type EntityTable } from 'dexie'

export interface Book {
  id: number
  title: string
  coverUrl?: string
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

const db = new Dexie('LesenDB') as Dexie & {
  books: EntityTable<Book, 'id'>
  chapters: EntityTable<Chapter, 'id'>
  words: EntityTable<Word, 'id'>
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

export { db }
