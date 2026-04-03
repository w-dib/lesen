import { useState } from 'react'
import { BookOpen, FileText, Archive } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db, type Book } from '@/db/database'

function generateColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 35%, 75%)`
}

interface BookCardProps {
  book: Book
  knownPercent: number
}

export default function BookCard({ book, knownPercent }: BookCardProps) {
  const navigate = useNavigate()
  const [showActions, setShowActions] = useState(false)

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation()
    await db.books.update(book.id, { archived: true })
  }

  return (
    <button
      onClick={() => navigate(`/book/${book.id}`)}
      onContextMenu={(e) => { e.preventDefault(); setShowActions(!showActions) }}
      className="relative flex gap-4 rounded-xl border border-brown-muted/10 bg-white p-3 text-left transition-colors hover:bg-cream-dark/50 active:bg-cream-dark"
    >
      {/* Cover */}
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="h-[90px] w-[60px] flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div
          className="flex h-[90px] w-[60px] flex-shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: generateColor(book.title) }}
        >
          {book.type === 'text' ? (
            <FileText className="h-6 w-6 text-white/90" />
          ) : (
            <span className="font-serif text-xl font-bold text-white/90">
              {book.title.slice(0, 2)}
            </span>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5">
            {book.type === 'text' ? (
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-brown-muted" />
            ) : (
              <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-brown-muted" />
            )}
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-brown">
              {book.title}
            </h3>
          </div>
          <p className="mt-1 text-xs text-brown-muted">
            {book.uniqueWords.toLocaleString()} words &middot; {book.totalWords.toLocaleString()} total
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-dark">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${knownPercent}%` }}
            />
          </div>
          <p className="mt-0.5 text-[10px] text-brown-muted">{knownPercent}% known</p>
        </div>
      </div>

      {/* Archive button — shown on long-press / right-click */}
      {showActions && (
        <div
          className="absolute right-2 top-2 z-10 animate-in fade-in"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleArchive}
            className="flex items-center gap-1.5 rounded-lg bg-brown px-3 py-1.5 text-xs font-medium text-cream shadow-md"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      )}
    </button>
  )
}
