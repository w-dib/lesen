import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'
import { useBookWordStats } from '@/hooks/useWords'
import BookCard from './BookCard'
import ImportModal from './ImportModal'
import type { Book } from '@/db/database'

function BookCardWithStats({ book }: { book: Book }) {
  const stats = useBookWordStats(book.id)
  return <BookCard book={book} knownPercent={stats?.percent ?? 0} />
}

export default function LibraryView() {
  const books = useBooks()
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-5 pb-2 pt-[calc(env(safe-area-inset-top,16px)+5px)]">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Lesen" className="h-7 w-7" />
          <h1 className="text-2xl font-bold text-brown">Library</h1>
        </div>
      </div>

      {/* Content */}
      {!books ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-brown-muted animate-pulse">Loading...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <img src="/logo.png" alt="Lesen" className="mb-4 h-16 w-16 opacity-60" />
          <p className="text-lg font-medium text-brown">Your library is empty</p>
          <p className="mt-1 text-sm text-brown-muted">Tap + to import your first text</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-24">
          {books.map(book => (
            <BookCardWithStats key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setImportOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brown text-cream shadow-lg transition-transform active:scale-95"
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
