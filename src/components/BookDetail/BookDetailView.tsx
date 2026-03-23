import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { useBook } from '@/hooks/useBooks'
import { useChapters } from '@/hooks/useChapters'
import { useBookWordStats } from '@/hooks/useWords'
import { db, type Chapter } from '@/db/database'
import { extractUniqueWords } from '@/services/textProcessor'

function generateColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash % 360)}, 35%, 75%)`
}

export default function BookDetailView() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const id = Number(bookId)
  const book = useBook(id)
  const chapters = useChapters(id)
  const stats = useBookWordStats(id)

  // Per-chapter: count of "new" words (0 means chapter is "complete")
  const chapterNewCounts = useLiveQuery(async () => {
    if (!chapters?.length) return new Map<number, number>()
    const counts = new Map<number, number>()
    for (const ch of chapters) {
      const uniqueWords = extractUniqueWords(ch.content)
      const wordRecords = await db.words.where('text').anyOf(uniqueWords).toArray()
      const newCount = wordRecords.filter(w => w.level === 'new').length
      counts.set(ch.id, newCount)
    }
    return counts
  }, [chapters])

  if (!book) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-brown-muted animate-pulse">Loading...</p>
      </div>
    )
  }

  async function openChapter(chapterId: number) {
    await db.books.update(id, { lastOpenedAt: new Date() })
    navigate(`/book/${id}/chapter/${chapterId}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 pt-[env(safe-area-inset-top,12px)]">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Book info */}
      <div className="flex flex-col items-center px-5 pb-5 pt-2">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-[180px] w-[120px] rounded-lg object-cover shadow-md"
          />
        ) : (
          <div
            className="flex h-[180px] w-[120px] items-center justify-center rounded-lg shadow-md"
            style={{ backgroundColor: generateColor(book.title) }}
          >
            <span className="font-serif text-3xl font-bold text-white/90">
              {book.title.slice(0, 2)}
            </span>
          </div>
        )}
        <h1 className="mt-4 text-center text-xl font-bold text-brown">{book.title}</h1>
        <p className="mt-1 text-sm text-brown-muted">
          {book.uniqueWords.toLocaleString()} unique words &middot; {stats?.percent ?? 0}% known
        </p>
      </div>

      {/* Chapter list */}
      <div className="flex-1 px-4 pb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brown-muted">
          Chapters
        </h2>
        <div className="flex flex-col gap-1.5">
          {chapters?.map(chapter => {
            const newCount = chapterNewCounts?.get(chapter.id)
            const isComplete = newCount === 0
            return (
              <button
                key={chapter.id}
                onClick={() => openChapter(chapter.id)}
                className="flex items-center justify-between rounded-lg border border-brown-muted/10 bg-white px-4 py-3 text-left transition-colors hover:bg-cream-dark/50 active:bg-cream-dark"
              >
                <div>
                  <p className="text-sm font-medium text-brown">{chapter.title}</p>
                  <p className="text-xs text-brown-muted">
                    {chapter.wordCount.toLocaleString()} words
                    {newCount != null && newCount > 0 && ` · ${newCount} new`}
                  </p>
                </div>
                {isComplete && (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-gold" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
