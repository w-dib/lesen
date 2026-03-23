import type { Book } from '@/db/database'
import { useNavigate } from 'react-router-dom'

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

  return (
    <button
      onClick={() => navigate(`/book/${book.id}`)}
      className="flex gap-4 rounded-xl border border-brown-muted/10 bg-white p-3 text-left transition-colors hover:bg-cream-dark/50 active:bg-cream-dark"
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
          <span className="font-serif text-xl font-bold text-white/90">
            {book.title.slice(0, 2)}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-brown">
            {book.title}
          </h3>
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
    </button>
  )
}
