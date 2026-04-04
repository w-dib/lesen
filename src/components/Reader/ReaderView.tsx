import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCheck, EyeOff, Globe } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { getReaderFontSize } from '@/components/Settings/SettingsView'
import { WordSpan } from './WordSpan'
import WordBottomSheet from './WordBottomSheet'
import { tokenize } from '@/services/textProcessor'
import { db, type Word, type Chapter } from '@/db/database'
import { isKnownWord } from '@/services/lemmatizer'
import { recordActivity } from '@/services/streak'

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

  // Save current page and record activity
  useEffect(() => {
    if (totalPages > 0) {
      db.books.update(bId, { lastChapterId: cId, lastPage: page })
      recordActivity()
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
    await db.transaction('rw', db.words, async () => {
      await db.words
        .where('lemma')
        .anyOf(lemmas)
        .modify({ level, updatedAt: now })
    })
  }

  // Ignore new words that are NOT in the target language dictionary
  async function handleIgnoreForeignWords() {
    const lang = book?.language ?? 'de'
    const now = new Date()
    const newWords = [...(wordMap?.values() ?? [])].filter(w => w.level === 'new')
    const foreignWords = newWords.filter(w => !isKnownWord(w.text, lang))
    const lemmas = [...new Set(foreignWords.map(w => w.lemma))]
    if (lemmas.length === 0) return
    await db.transaction('rw', db.words, async () => {
      await db.words
        .where('lemma')
        .anyOf(lemmas)
        .modify({ level: 'ignored', updatedAt: now })
    })
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

  const newWords = [...wordMap.values()].filter(w => w.level === 'new')
  const newCount = newWords.length
  const foreignCount = newWords.filter(w => !isKnownWord(w.text, book?.language ?? 'de')).length

  return (
    <div className="flex flex-1 flex-col bg-cream">
      {/* Reading area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-20 pt-4 lg:px-0">
        <div className="mx-auto lg:max-w-2xl">
        {/* Inline header — scrolls with content */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => navigate(`/book/${bId}`)}
            className="rounded-lg p-1.5 text-brown-muted hover:bg-cream-dark hover:text-brown"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-medium text-brown truncate">{chapter.title}</p>
        </div>

        <div className="leading-[2] text-brown" dir={book?.language === 'ar' ? 'rtl' : 'ltr'} style={{ fontSize: `${getReaderFontSize()}px` }}>
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
            {foreignCount > 0 && (
              <Button variant="outline" size="sm" className="w-full text-brown-muted" onClick={handleIgnoreForeignWords}>
                <Globe className="h-4 w-4" />
                Ignore {foreignCount} foreign words
              </Button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Sticky bottom page nav */}
      <div className="sticky bottom-0 z-40 flex items-center justify-between border-t border-brown-muted/10 bg-cream/95 px-3 py-2 backdrop-blur-sm">
        <button
          disabled={page === 0 && !prevChapter}
          onClick={goPrevPage}
          className="rounded-lg p-2 text-brown-muted transition-colors hover:bg-cream-dark hover:text-brown disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-xs text-brown-muted">
          {totalPages > 1 ? `${page + 1} / ${totalPages}` : chapter.title}
        </span>
        <button
          disabled={page === totalPages - 1 && !nextChapter}
          onClick={goNextPage}
          className="rounded-lg p-2 text-brown-muted transition-colors hover:bg-cream-dark hover:text-brown disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
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
