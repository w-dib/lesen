import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'

export function useBooks() {
  const books = useLiveQuery(
    () => db.books.orderBy('lastOpenedAt').reverse().toArray()
  )
  return books
}

export function useBook(bookId: number | undefined) {
  return useLiveQuery(
    () => bookId ? db.books.get(bookId) : undefined,
    [bookId]
  )
}
