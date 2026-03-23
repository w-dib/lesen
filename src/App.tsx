import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { db } from '@/db/database'
import BottomTabs from '@/components/BottomTabs'
import LibraryView from '@/components/Library/LibraryView'
import VocabularyView from '@/components/Vocabulary/VocabularyView'
import SettingsView from '@/components/Settings/SettingsView'
import BookDetailView from '@/components/BookDetail/BookDetailView'
import ReaderView from '@/components/Reader/ReaderView'
import { initLemmatizer } from '@/services/lemmatizer'

export default function App() {
  const [ready, setReady] = useState(false)

  const [resumePath, setResumePath] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      initLemmatizer(),
      db.books.orderBy('lastOpenedAt').reverse().first().then(book => {
        if (book?.lastChapterId) {
          setResumePath(`/book/${book.id}/chapter/${book.lastChapterId}`)
        }
      }),
    ]).then(() => setReady(true))
  }, [])

  // Clear resume path after first render so navigating to "/" later shows library
  useEffect(() => {
    if (resumePath) setResumePath(null)
  }, [resumePath])

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Lesen" className="h-16 w-16" />
          <p className="text-sm text-brown-muted animate-pulse">Loading Lesen...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={resumePath ? <Navigate to={resumePath} replace /> : <LibraryView />} />
            <Route path="/vocabulary" element={<VocabularyView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/book/:bookId" element={<BookDetailView />} />
            <Route path="/book/:bookId/chapter/:chapterId" element={<ReaderView />} />
          </Routes>
        </main>
        <BottomTabs />
      </div>
    </BrowserRouter>
  )
}
