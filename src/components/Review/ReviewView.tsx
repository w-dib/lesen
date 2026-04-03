import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Check, X, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { db, type Word } from '@/db/database'
import { useLiveQuery } from 'dexie-react-hooks'
import { fetchReviewExercises, type ReviewExercise } from '@/services/reviewApi'
import { getCachedExercises, markExercisesUsed, preGenerateExercises } from '@/services/exerciseCache'
import { recordActivity } from '@/services/streak'
import MatchExercise from './MatchExercise'
import { cn } from '@/lib/utils'

const SESSION_SIZE = 10

interface LemmaGroup {
  lemma: string
  forms: Word[]
  translation?: string
  reviewStreak: number
}

type ExerciseType = 'flashcard' | 'cloze' | 'match'

interface SessionCard {
  group: LemmaGroup
  exercise?: ReviewExercise
  type: ExerciseType
  matchPairs?: { lemma: string; translation: string }[]
}

export default function ReviewView() {
  const navigate = useNavigate()

  // Get all "learning" words grouped by lemma
  const allWords = useLiveQuery(() =>
    db.words.where('level').equals('learning').toArray()
  )

  const groups = useMemo(() => {
    if (!allWords) return []
    const lemmaMap = new Map<string, Word[]>()
    for (const w of allWords) {
      const arr = lemmaMap.get(w.lemma)
      if (arr) arr.push(w)
      else lemmaMap.set(w.lemma, [w])
    }
    const result: LemmaGroup[] = []
    for (const [lemma, forms] of lemmaMap) {
      const translation = forms.find(f => f.translation)?.translation
      const reviewStreak = Math.min(...forms.map(f => f.reviewStreak ?? 0))
      result.push({ lemma, forms, translation, reviewStreak })
    }
    return result
  }, [allWords])

  // Session state
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<('correct' | 'wrong')[]>([])

  // Flashcard state
  const [flipped, setFlipped] = useState(false)

  // Cloze state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [clozeRevealed, setClozeRevealed] = useState(false)

  // Build session when groups are ready
  useEffect(() => {
    if (!groups.length) {
      setLoading(false)
      return
    }

    // Pick up to SESSION_SIZE words, shuffled
    const shuffled = [...groups].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, SESSION_SIZE)

    setLoading(true)
    setError(null)

    // Try cache first, then fetch uncached from DeepSeek
    const selectedLemmas = selected.map(g => g.lemma)
    getCachedExercises(selectedLemmas)
      .then(async (cachedMap) => {
        // Find which lemmas still need exercises
        const uncachedWords = selected
          .filter(g => !cachedMap.has(g.lemma.toLowerCase()))
          .map(g => ({ lemma: g.lemma, translation: g.translation }))

        // Fetch only uncached exercises from API
        let freshExercises: ReviewExercise[] = []
        if (uncachedWords.length > 0) {
          try {
            freshExercises = await fetchReviewExercises(uncachedWords)
          } catch {
            // API failed — proceed with cached only
          }
        }

        // Merge cached + fresh
        const exerciseMap = new Map<string, ReviewExercise>(cachedMap)
        for (const ex of freshExercises) {
          exerciseMap.set(ex.lemma.toLowerCase(), ex)
        }

        const cards: SessionCard[] = selected.map(group => {
          const exercise = exerciseMap.get(group.lemma.toLowerCase())
          // Randomly assign flashcard or cloze (prefer cloze if we have an exercise)
          const type: ExerciseType = exercise
            ? (Math.random() > 0.4 ? 'cloze' : 'flashcard')
            : 'flashcard'
          return { group, exercise, type }
        })

        // Insert a match round if we have 5+ words with translations
        const withTranslation = selected.filter(g => g.translation)
        if (withTranslation.length >= 5) {
          const matchPairs = withTranslation.slice(0, 5).map(g => ({
            lemma: g.lemma,
            translation: g.translation!,
          }))
          // Insert match card halfway through
          const matchCard: SessionCard = {
            group: withTranslation[0],
            type: 'match',
            matchPairs,
          }
          const insertAt = Math.min(5, cards.length)
          cards.splice(insertAt, 0, matchCard)
        }

        setSessionCards(cards)
        setCurrentIdx(0)
        setResults([])
        setFlipped(false)
        setSelectedAnswer(null)
        setClozeRevealed(false)
        setLoading(false)
      })
      .catch(() => {
        // Fallback: flashcards only (no API)
        const cards: SessionCard[] = selected.map(group => ({
          group,
          type: 'flashcard' as ExerciseType,
        }))
        setSessionCards(cards)
        setCurrentIdx(0)
        setResults([])
        setFlipped(false)
        setLoading(false)
        setError('Could not connect to AI — using flashcards only')
      })
  }, [groups.length]) // Only rebuild on count change, not reference

  const currentCard = sessionCards[currentIdx] as SessionCard | undefined
  const isSessionDone = currentIdx >= sessionCards.length && sessionCards.length > 0

  const [answered, setAnswered] = useState(false)

  const recordResult = useCallback(async (correct: boolean) => {
    if (!currentCard) return

    const newResult = correct ? 'correct' : 'wrong'
    setResults(prev => [...prev, newResult])
    setAnswered(true)
    recordActivity()

    // Update streaks in DB
    const { group } = currentCard
    const newStreak = correct ? (group.reviewStreak + 1) : 0
    const shouldPromote = newStreak >= 3

    await db.words
      .where('lemma')
      .equals(group.lemma)
      .modify({
        reviewStreak: newStreak,
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
        ...(shouldPromote ? { level: 'known' as const } : {}),
      })
  }, [currentCard])

  const advanceToNext = useCallback(() => {
    setCurrentIdx(prev => prev + 1)
    setFlipped(false)
    setSelectedAnswer(null)
    setClozeRevealed(false)
    setAnswered(false)
  }, [])

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <ReviewHeader onBack={() => navigate('/vocabulary')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <img src="/logo.png" alt="Loading" className="h-12 w-12 animate-spin" />
          <p className="text-sm text-brown-muted">Generating exercises...</p>
        </div>
      </div>
    )
  }

  if (!groups.length) {
    return (
      <div className="flex flex-1 flex-col">
        <ReviewHeader onBack={() => navigate('/vocabulary')} />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-brown-muted/40" />
          <p className="text-lg font-medium text-brown">No words to review</p>
          <p className="mt-1 text-sm text-brown-muted">
            Mark words as &quot;Learning&quot; while reading to add them here
          </p>
          <Button className="mt-4" onClick={() => navigate('/vocabulary')}>
            Back to Vocabulary
          </Button>
        </div>
      </div>
    )
  }

  // When session ends, mark exercises as used and pre-generate for next time
  useEffect(() => {
    if (isSessionDone && sessionCards.length > 0) {
      const usedLemmas = sessionCards
        .filter(c => c.type !== 'match')
        .map(c => c.group.lemma)
      markExercisesUsed(usedLemmas).then(() => preGenerateExercises())
    }
  }, [isSessionDone])

  if (isSessionDone) {
    const correctCount = results.filter(r => r === 'correct').length
    return (
      <div className="flex flex-1 flex-col">
        <ReviewHeader onBack={() => navigate('/vocabulary')} />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 text-5xl font-bold text-brown">
            {correctCount}/{results.length}
          </div>
          <p className="text-lg font-medium text-brown">
            {correctCount === results.length
              ? 'Perfect!'
              : correctCount >= results.length * 0.7
              ? 'Great work!'
              : 'Keep practicing!'}
          </p>
          <p className="mt-1 text-sm text-brown-muted">
            {results.length} words reviewed
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => navigate('/vocabulary')}>
              Done
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" />
              Review again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <ReviewHeader
        onBack={() => navigate('/vocabulary')}
        progress={`${currentIdx + 1} / ${sessionCards.length}`}
      />

      {error && (
        <div className="mx-5 mb-2 rounded-lg bg-amber/20 px-3 py-2 text-xs text-brown-muted">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="mx-5 mb-4 h-1.5 overflow-hidden rounded-full bg-cream-dark">
        <div
          className="h-full rounded-full bg-gold transition-all duration-300"
          style={{ width: `${((currentIdx) / sessionCards.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col px-5">
        {currentCard && currentCard.type === 'flashcard' && (
          <FlashcardExercise
            card={currentCard}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            onResult={recordResult}
          />
        )}
        {currentCard && currentCard.type === 'cloze' && (
          <ClozeExercise
            card={currentCard}
            selectedAnswer={selectedAnswer}
            revealed={clozeRevealed}
            onSelect={(answer) => {
              setSelectedAnswer(answer)
              setClozeRevealed(true)
              const correct = answer === currentCard.group.lemma
              recordResult(correct)
            }}
          />
        )}
        {currentCard && currentCard.type === 'match' && currentCard.matchPairs && (
          <MatchExercise
            pairs={currentCard.matchPairs}
            onComplete={(correct, total) => {
              // Record each match result individually
              for (let i = 0; i < total; i++) {
                setResults(prev => [...prev, i < correct ? 'correct' : 'wrong'])
              }
              setAnswered(true)
              // Auto-advance after a brief pause
              setTimeout(advanceToNext, 800)
            }}
          />
        )}

        {/* Next button — visible after answering (not for match, it has its own) */}
        {answered && currentCard?.type !== 'match' && (
          <button
            onClick={advanceToNext}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brown py-3.5 text-sm font-medium text-cream transition-all active:scale-[0.98]"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ReviewHeader({ onBack, progress }: { onBack: () => void; progress?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,16px)+5px)]">
      <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-cream-dark">
        <ArrowLeft className="h-5 w-5 text-brown" />
      </button>
      <h1 className="flex-1 text-lg font-semibold text-brown">Review</h1>
      {progress && (
        <span className="text-sm text-brown-muted">{progress}</span>
      )}
    </div>
  )
}

function FlashcardExercise({
  card,
  flipped,
  onFlip,
  onResult,
}: {
  card: SessionCard
  flipped: boolean
  onFlip: () => void
  onResult: (correct: boolean) => void
}) {
  const { group, exercise } = card

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      {/* Card */}
      <button
        onClick={() => !flipped && onFlip()}
        className={cn(
          'w-full max-w-sm rounded-2xl border border-brown-muted/15 bg-white p-8 shadow-sm transition-all',
          !flipped && 'active:scale-[0.98] cursor-pointer',
        )}
      >
        <p className="text-center text-2xl font-bold text-brown">{group.lemma}</p>
        {group.reviewStreak > 0 && (
          <p className="mt-1 text-center text-xs text-brown-muted">
            Streak: {group.reviewStreak}/3
          </p>
        )}

        {flipped && (
          <div className="mt-6 border-t border-brown-muted/15 pt-6">
            <p className="text-center text-lg text-brown">
              {group.translation || 'No translation set'}
            </p>
            {exercise?.sentence && (
              <div className="mt-4 rounded-lg bg-cream-dark/50 p-3">
                <p className="text-sm italic text-brown">{exercise.sentence}</p>
                <p className="mt-1 text-xs text-brown-muted">{exercise.translation}</p>
              </div>
            )}
          </div>
        )}

        {!flipped && (
          <p className="mt-4 text-center text-xs text-brown-muted">Tap to reveal</p>
        )}
      </button>

      {/* Answer buttons */}
      {flipped && (
        <div className="mt-6 flex gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onResult(false)}
          >
            <X className="h-5 w-5" />
            Still learning
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => onResult(true)}
          >
            <Check className="h-5 w-5" />
            Got it
          </Button>
        </div>
      )}
    </div>
  )
}

function ClozeExercise({
  card,
  selectedAnswer,
  revealed,
  onSelect,
}: {
  card: SessionCard
  selectedAnswer: string | null
  revealed: boolean
  onSelect: (answer: string) => void
}) {
  const { group, exercise } = card

  // Shuffle options: correct answer + distractors (must be before early return — hooks can't be conditional)
  const options = useMemo(() => {
    if (!exercise) return []
    const opts = [group.lemma, ...exercise.distractors.slice(0, 3)]
    return opts.sort(() => Math.random() - 0.5)
  }, [group.lemma, exercise])

  if (!exercise) return null

  // Use pre-blanked sentence from API, with regex fallback
  const blankSentence = exercise.blanked || exercise.sentence.replace(
    new RegExp(`\\b${group.lemma}\\b`, 'i'),
    '______'
  )

  return (
    <div className="flex flex-1 flex-col">
      {/* Sentence card */}
      <div className="mt-4 rounded-2xl border border-brown-muted/15 bg-white p-6 shadow-sm">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brown-muted">
          Fill in the blank
        </p>
        <p className="text-lg leading-relaxed text-brown">{blankSentence}</p>
        {revealed && (
          <p className="mt-3 text-sm text-brown-muted">{exercise.translation}</p>
        )}
      </div>

      {/* Options */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrect = option === group.lemma
          const isSelected = selectedAnswer === option
          let style = 'border-brown-muted/20 bg-white text-brown hover:bg-cream-dark'
          if (revealed) {
            if (isCorrect) {
              style = 'border-green-400 bg-green-50 text-green-800'
            } else if (isSelected && !isCorrect) {
              style = 'border-red-300 bg-red-50 text-red-700'
            } else {
              style = 'border-brown-muted/10 bg-cream-dark/50 text-brown-muted'
            }
          }

          return (
            <button
              key={option}
              onClick={() => !revealed && onSelect(option)}
              disabled={revealed}
              className={cn(
                'rounded-xl border-2 px-4 py-3.5 text-center text-sm font-medium transition-all',
                style,
              )}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Streak indicator on correct */}
      {revealed && selectedAnswer === group.lemma && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-green-700">
            {group.reviewStreak + 1 >= 3
              ? 'Mastered! Moving to known.'
              : `Streak: ${group.reviewStreak + 1}/3`}
          </p>
        </div>
      )}
      {revealed && selectedAnswer !== group.lemma && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-red-600">
            The answer was: <span className="font-bold">{group.lemma}</span>
          </p>
        </div>
      )}
    </div>
  )
}
