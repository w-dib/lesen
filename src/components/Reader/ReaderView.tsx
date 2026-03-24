import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCheck, EyeOff } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { getReaderFontSize } from '@/components/Settings/SettingsView'
import { WordSpan } from './WordSpan'
import WordBottomSheet from './WordBottomSheet'
import { tokenize } from '@/services/textProcessor'
import { db, type Word, type Chapter } from '@/db/database'

const WORDS_PER_PAGE = 500

export default function ReaderView() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const bId = Number(bookId)
  const cId = Number(chapterId)

  const book = useLiveQuery(() => db.books.get(bId), [bId])
  const chapter = useLiveQuery(() => db.chapters.get(cId), [cId])
  const chapters = useLiveQuery(
    () => db.chapters.where('bookId').equals(bId).sortBy('orderIndex'),
    [bId]
  )

  // All tokens for the chapter
  const tokens = useMemo(() => (chapter ? tokenize(chapter.content) : []), [chapter?.content])

  // Split tokens into pages, breaking at sentence boundaries
  const pages = useMemo(() => {
    if (tokens.length === 0) return []
    const result: { start: number; end: number }[] = []
    let pageStart = 0
    while (pageStart < tokens.length) {
      let pageEnd = Math.min(pageStart + WORDS_PER_PAGE, tokens.length) - 1
      // If not at the very end, find the nearest sentence boundary
      if (pageEnd < tokens.length - 1) {
        // Look forward up to 50 tokens for a sentence end
        for (let i = pageEnd; i < Math.min(pageEnd + 50, tokens.length); i++) {
          if (/[.!?]/.test(tokens[i].post)) {
            pageEnd = i
            break
          }
        }
      } else {
        pageEnd = tokens.length - 1
      }
      result.push({ start: pageStart, end: pageEnd })
      pageStart = pageEnd + 1
    }
    return result
  }, [tokens])

  const totalPages = pages.length

  // Restore page from saved state
  const [page, setPage] = useState(0)
  const restoredPageRef = useRef(false)
  useEffect(() => {
    if (restoredPageRef.current || !totalPages) return
    restoredPageRef.current = true
    db.books.get(bId).then(book => {
      if (book?.lastChapterId === cId && book.lastPage != null && book.lastPage < totalPages) {
        setPage(book.lastPage)
      }
    })
  }, [bId, cId, totalPages])

  // Reset page when chapter changes
  const prevChapterIdRef = useRef(cId)
  useEffect(() => {
    if (prevChapterIdRef.current !== cId) {
      setPage(0)
      restoredPageRef.current = false
      prevChapterIdRef.current = cId
    }
  }, [cId])

  // Save current page
  useEffect(() => {
    if (totalPages > 0) {
      db.books.update(bId, { lastChapterId: cId, lastPage: page })
    }
  }, [bId, cId, page, totalPages])

  // Current page tokens
  const pageRange = pages[page]
  const pageTokens = pageRange ? tokens.slice(pageRange.start, pageRange.end + 1) : []

  const uniqueWordTexts = useMemo(() => {
    const set = new Set<string>()
    for (const t of pageTokens) set.add(t.word.toLowerCase())
    return [...set]
  }, [pageTokens])

  const wordMap = useLiveQuery(async () => {
    if (uniqueWordTexts.length === 0) return new Map<string, Word>()
    const records = await db.words.where('text').anyOf(uniqueWordTexts).toArray()
    return new Map(records.map(w => [w.text, w]))
  }, [uniqueWordTexts])

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const selectedToken = selectedIdx !== null ? tokens[selectedIdx] : undefined
  const selectedWord = selectedToken ? wordMap?.get(selectedToken.word.toLowerCase()) : undefined

  // Build sentence string around selected word
  const selectedSentence = useMemo(() => {
    if (selectedIdx === null || !tokens.length) return undefined
    let start = selectedIdx
    for (let i = selectedIdx - 1; i >= 0; i--) {
      if (/[.!?]/.test(tokens[i].post)) { start = i + 1; break }
      if (i === 0) start = 0
    }
    let end = selectedIdx
    for (let i = selectedIdx; i < tokens.length; i++) {
      end = i
      if (/[.!?]/.test(tokens[i].post)) break
    }
    return tokens.slice(start, end + 1).map(t => t.word + t.post).join(' ')
  }, [selectedIdx, tokens])

  const handleWordTap = useCallback((globalIndex: number) => {
    setSelectedIdx(globalIndex)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedIdx(null)
  }, [])

  // Scroll to top when page changes
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [page])

  // Chapter navigation
  const currentChapterIndex = chapters?.findIndex((c: Chapter) => c.id === cId) ?? -1
  const prevChapter = chapters && currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null
  const nextChapter = chapters && currentChapterIndex < (chapters.length - 1) ? chapters[currentChapterIndex + 1] : null

  // Mark all new words on current page as known or ignored
  async function handleMarkAllNew(level: 'known' | 'ignored') {
    const now = new Date()
    const newWords = [...(wordMap?.values() ?? [])].filter(w => w.level === 'new')
    const lemmas = [...new Set(newWords.map(w => w.lemma))]
    for (const lemma of lemmas) {
      await db.words.where('lemma').equals(lemma).modify({ level, updatedAt: now })
    }
  }

  function goNextPage() {
    if (page < totalPages - 1) {
      setPage(page + 1)
    } else if (nextChapter) {
      navigate(`/book/${bId}/chapter/${nextChapter.id}`)
    }
  }

  function goPrevPage() {
    if (page > 0) {
      setPage(page - 1)
    } else if (prevChapter) {
      navigate(`/book/${bId}/chapter/${prevChapter.id}`)
    }
  }

  if (!chapter || !wordMap) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-brown-muted animate-pulse">Loading...</p>
      </div>
    )
  }

  const newCount = [...wordMap.values()].filter(w => w.level === 'new').length

  return (
    <div className="flex flex-1 flex-col bg-cream">
      {/* Top toolbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-brown-muted/10 bg-cream/95 px-2 py-2 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/book/${bId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-brown truncate max-w-[50vw]">{chapter.title}</p>
          {totalPages > 1 && (
            <p className="text-[10px] text-brown-muted">Page {page + 1} of {totalPages}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            disabled={!prevChapter}
            onClick={() => prevChapter && navigate(`/book/${bId}/chapter/${prevChapter.id}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!nextChapter}
            onClick={() => nextChapter && navigate(`/book/${bId}/chapter/${nextChapter.id}`)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Reading area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="leading-[2] text-brown" style={{ fontSize: `${getReaderFontSize()}px` }}>
          {pageTokens.map((token, i) => {
            const globalIdx = pageRange.start + i
            return (
              <WordSpan
                key={globalIdx}
                token={token}
                word={wordMap.get(token.word.toLowerCase())}
                onTap={() => handleWordTap(globalIdx)}
              />
            )
          })}
        </div>

        {/* Mark all buttons */}
        {newCount > 0 && (
          <div className="mx-auto mt-8 flex w-64 flex-col gap-2 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleMarkAllNew('known')}>
              <CheckCheck className="h-4 w-4" />
              Mark all {newCount} new words as known
            </Button>
            <Button variant="outline" size="sm" className="w-full text-brown-muted" onClick={() => handleMarkAllNew('ignored')}>
              <EyeOff className="h-4 w-4" />
              Ignore all {newCount} new words
            </Button>
          </div>
        )}

        {/* Page / chapter nav at bottom */}
        <div className="mt-6 flex justify-between pb-8">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0 && !prevChapter}
            onClick={goPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
            {page > 0 ? 'Previous page' : 'Previous'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages - 1 && !nextChapter}
            onClick={goNextPage}
          >
            {page < totalPages - 1 ? 'Next page' : 'Next chapter'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Word bottom sheet */}
      <WordBottomSheet
        open={selectedIdx !== null}
        onClose={handleCloseSheet}
        word={selectedWord}
        sentence={selectedSentence}
        language={book?.language}
      />
    </div>
  )
}
