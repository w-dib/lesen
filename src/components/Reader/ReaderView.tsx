import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
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

  // Chapter navigation
  const currentChapterIndex = chapters?.findIndex((c: Chapter) => c.id === cId) ?? -1
  const prevChapter = chapters && currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null
  const nextChapter = chapters && currentChapterIndex < (chapters.length - 1) ? chapters[currentChapterIndex + 1] : null

  // Mark all new words as known
  async function handleMarkAllKnown() {
    const now = new Date()
    const newWords = [...(wordMap?.values() ?? [])].filter(w => w.level === 'new')
    const lemmas = [...new Set(newWords.map(w => w.lemma))]
    for (const lemma of lemmas) {
      await db.words.where('lemma').equals(lemma).modify({ level: 'known', updatedAt: now })
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
      <div className="flex-1 overflow-y-auto px-5 py-6">
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

        {/* Mark all known button */}
        {newCount > 0 && (
          <div className="mt-8 flex justify-center pb-4">
            <Button variant="outline" size="sm" onClick={handleMarkAllKnown}>
              <CheckCheck className="h-4 w-4" />
              Mark all {newCount} new words as known
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
