import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'

export function useChapters(bookId: number | undefined) {
  return useLiveQuery(
    () => bookId
      ? db.chapters.where('bookId').equals(bookId).sortBy('orderIndex')
      : [],
    [bookId]
  )
}
