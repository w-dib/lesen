import { useState, useMemo } from 'react'
import { Plus, Archive, ArrowLeft } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'
import { useBookWordStats } from '@/hooks/useWords'
import BookCard from './BookCard'
import ImportModal from './ImportModal'
import StreakBar from './StreakBar'
import type { Book } from '@/db/database'


function BookCardWithStats({ book }: { book: Book }) {
  const stats = useBookWordStats(book.id)
  return <BookCard book={book} knownPercent={stats?.percent ?? 0} />
}

export default function LibraryView() {
  const books = useBooks()
  const [importOpen, setImportOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const activeBooks = useMemo(() => books?.filter(b => !b.archived), [books])
  const archivedBooks = useMemo(() => books?.filter(b => b.archived), [books])
  const archivedCount = archivedBooks?.length ?? 0

  const displayBooks = showArchived ? archivedBooks : activeBooks

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-5 pb-2 pt-[calc(env(safe-area-inset-top,16px)+16px)]">
        {showArchived ? (
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setShowArchived(false)}
              className="rounded-lg p-1.5 hover:bg-cream-dark"
            >
              <ArrowLeft className="h-5 w-5 text-brown" />
            </button>
            <Archive className="h-5 w-5 text-brown-muted" />
            <h1 className="text-2xl font-bold text-brown">Archived</h1>
            <span className="text-sm text-brown-muted">({archivedCount})</span>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="Lesen" className="h-7 w-7 lg:hidden" />
              <h1 className="text-2xl font-bold text-brown">Library</h1>
            </div>
            <StreakBar />
          </>
        )}
      </div>

      {/* Content */}
      {!books ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-brown-muted animate-pulse">Loading...</p>
        </div>
      ) : activeBooks && activeBooks.length === 0 && !showArchived ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <img src="/logo.png" alt="Lesen" className="mb-4 h-16 w-16 opacity-60" />
          <p className="text-lg font-medium text-brown">Your library is empty</p>
          <p className="mt-1 text-sm text-brown-muted">Tap + to add your first content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 overflow-y-auto px-4 pb-24 lg:grid-cols-2 xl:grid-cols-3">
          {displayBooks?.map(book => (
            <BookCardWithStats key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Archived toggle — only show in active view */}
      {archivedCount > 0 && !showArchived && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowArchived(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-brown-muted transition-colors hover:text-brown"
          >
            <Archive className="h-3.5 w-3.5" />
            Archived ({archivedCount})
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setImportOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brown text-cream shadow-lg transition-transform active:scale-95 lg:bottom-8"
      >
        <Plus className="h-7 w-7" />
      </button>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {}}
      />
    </div>
  )
}
