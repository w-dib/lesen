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

export default function ReaderView() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const bId = Number(bookId)
  const cId = Number(chapterId)

  const chapter = useLiveQuery(() => db.chapters.get(cId), [cId])
  const chapters = useLiveQuery(
    () => db.chapters.where('bookId').equals(bId).sortBy('orderIndex'),
    [bId]
  )

  // Get all words for this chapter in a single batch
  const tokens = useMemo(() => (chapter ? tokenize(chapter.content) : []), [chapter?.content])

  const uniqueWordTexts = useMemo(() => {
    const set = new Set<string>()
    for (const t of tokens) set.add(t.word.toLowerCase())
    return [...set]
  }, [tokens])

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
    // Walk back to find sentence start
    let start = selectedIdx
    for (let i = selectedIdx - 1; i >= 0; i--) {
      if (/[.!?]/.test(tokens[i].post)) { start = i + 1; break }
      if (i === 0) start = 0
    }
    // Walk forward to find sentence end
    let end = selectedIdx
    for (let i = selectedIdx; i < tokens.length; i++) {
      end = i
      if (/[.!?]/.test(tokens[i].post)) break
    }
    return tokens.slice(start, end + 1).map(t => t.word + t.post).join(' ')
  }, [selectedIdx, tokens])

  const handleWordTap = useCallback((index: number) => {
    setSelectedIdx(index)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedIdx(null)
  }, [])

  // Save lastChapterId and scroll position
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    db.books.update(bId, { lastChapterId: cId })
  }, [bId, cId])

  // Restore scroll position once content is rendered
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || !scrollRef.current || !tokens.length) return
    restoredRef.current = true
    db.books.get(bId).then(book => {
      if (book?.scrollPosition && book.lastChapterId === cId && scrollRef.current) {
        const el = scrollRef.current
        requestAnimationFrame(() => {
          el.scrollTop = book.scrollPosition! * (el.scrollHeight - el.clientHeight)
        })
      }
    })
  }, [bId, cId, tokens.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        const fraction = el.scrollTop / (el.scrollHeight - el.clientHeight || 1)
        db.books.update(bId, { scrollPosition: fraction })
      }, 300)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(scrollTimerRef.current)
      el.removeEventListener('scroll', handleScroll)
    }
  }, [bId])

  // Chapter navigation
  const currentChapterIndex = chapters?.findIndex((c: Chapter) => c.id === cId) ?? -1
  const prevChapter = chapters && currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null
  const nextChapter = chapters && currentChapterIndex < (chapters.length - 1) ? chapters[currentChapterIndex + 1] : null

  // Mark all new words as known or ignored
  async function handleMarkAllNew(level: 'known' | 'ignored') {
    const now = new Date()
    const newWords = [...(wordMap?.values() ?? [])].filter(w => w.level === 'new')
    const lemmas = [...new Set(newWords.map(w => w.lemma))]
    for (const lemma of lemmas) {
      await db.words.where('lemma').equals(lemma).modify({ level, updatedAt: now })
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
        <p className="text-sm font-medium text-brown truncate max-w-[50%]">{chapter.title}</p>
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
          {tokens.map((token, i) => (
            <WordSpan
              key={i}
              token={token}
              word={wordMap.get(token.word.toLowerCase())}
              onTap={() => handleWordTap(i)}
            />
          ))}
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

        {/* Chapter nav at bottom */}
        <div className="mt-6 flex justify-between pb-8">
          {prevChapter ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/book/${bId}/chapter/${prevChapter.id}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          ) : <div />}
          {nextChapter ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/book/${bId}/chapter/${nextChapter.id}`)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : <div />}
        </div>
      </div>

      {/* Word bottom sheet */}
      <WordBottomSheet
        open={selectedIdx !== null}
        onClose={handleCloseSheet}
        word={selectedWord}
        sentence={selectedSentence}
      />
    </div>
  )
}
