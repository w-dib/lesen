import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'

export function useBookWordStats(bookId: number | undefined) {
  return useLiveQuery(async () => {
    if (!bookId) return { total: 0, known: 0, percent: 0 }
    const words = await db.words.where('bookIds').equals(bookId).toArray()
    const total = words.length
    const known = words.filter(w => w.level === 'known' || w.level === 'ignored').length
    const percent = total > 0 ? Math.round((known / total) * 100) : 0
    return { total, known, percent }
  }, [bookId])
}

export function useChapterWords(chapterContent: string | undefined) {
  return useLiveQuery(async () => {
    if (!chapterContent) return new Map()
    const wordRe = /[\p{L}\p{M}'-]+/gu
    const uniqueWords = new Set<string>()
    for (const match of chapterContent.matchAll(wordRe)) {
      uniqueWords.add(match[0].toLowerCase())
    }
    const wordRecords = await db.words.where('text').anyOf([...uniqueWords]).toArray()
    return new Map(wordRecords.map(w => [w.text, w]))
  }, [chapterContent])
}
