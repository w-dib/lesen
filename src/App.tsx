import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BottomTabs from '@/components/BottomTabs'
import LibraryView from '@/components/Library/LibraryView'
import VocabularyView from '@/components/Vocabulary/VocabularyView'
import SettingsView from '@/components/Settings/SettingsView'
import BookDetailView from '@/components/BookDetail/BookDetailView'
import ReaderView from '@/components/Reader/ReaderView'
import { initLemmatizer } from '@/services/lemmatizer'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initLemmatizer().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-brown-muted animate-pulse">Loading Lesen...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<LibraryView />} />
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
