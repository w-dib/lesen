import { useState, useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchPair {
  lemma: string
  translation: string
}

interface MatchExerciseProps {
  pairs: MatchPair[]
  onComplete: (correctCount: number, totalCount: number) => void
}

export default function MatchExercise({ pairs, onComplete }: MatchExerciseProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matches, setMatches] = useState<Map<string, string>>(new Map())
  const [revealed, setRevealed] = useState(false)

  // Shuffle right column independently
  const shuffledRight = useMemo(
    () => [...pairs].sort(() => Math.random() - 0.5),
    [pairs]
  )

  function handleLeftTap(lemma: string) {
    if (revealed) return
    if (selectedLeft === lemma) {
      setSelectedLeft(null)
      return
    }
    setSelectedLeft(lemma)
    if (selectedRight) {
      // Make the match
      setMatches(prev => new Map(prev).set(lemma, selectedRight))
      setSelectedLeft(null)
      setSelectedRight(null)
    }
  }

  function handleRightTap(translation: string) {
    if (revealed) return
    if (selectedRight === translation) {
      setSelectedRight(null)
      return
    }
    setSelectedRight(translation)
    if (selectedLeft) {
      // Make the match
      setMatches(prev => new Map(prev).set(selectedLeft, translation))
      setSelectedLeft(null)
      setSelectedRight(null)
    }
  }

  function handleCheck() {
    setRevealed(true)
  }

  function handleNext() {
    let correct = 0
    for (const pair of pairs) {
      if (matches.get(pair.lemma) === pair.translation) correct++
    }
    onComplete(correct, pairs.length)
  }

  function isLeftMatched(lemma: string) {
    return matches.has(lemma)
  }

  function isRightMatched(translation: string) {
    return [...matches.values()].includes(translation)
  }

  function getMatchResult(lemma: string) {
    if (!revealed) return null
    const picked = matches.get(lemma)
    const correct = pairs.find(p => p.lemma === lemma)?.translation
    return picked === correct ? 'correct' : 'wrong'
  }

  const allMatched = matches.size === pairs.length

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-2 rounded-2xl border border-brown-muted/15 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brown-muted">
          Match the words to their translations
        </p>

        <div className="flex gap-3">
          {/* Left column — words */}
          <div className="flex flex-1 flex-col gap-2">
            {pairs.map(({ lemma }) => {
              const matched = isLeftMatched(lemma)
              const result = getMatchResult(lemma)
              return (
                <button
                  key={lemma}
                  onClick={() => handleLeftTap(lemma)}
                  disabled={revealed}
                  className={cn(
                    'rounded-xl border-2 px-3 py-3 text-center text-sm font-medium transition-all',
                    selectedLeft === lemma
                      ? 'border-gold bg-amber/20 text-brown'
                      : matched && !revealed
                      ? 'border-brown-muted/20 bg-cream-dark text-brown-muted'
                      : result === 'correct'
                      ? 'border-green-400 bg-green-50 text-green-800'
                      : result === 'wrong'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-brown-muted/20 bg-white text-brown hover:bg-cream-dark',
                  )}
                >
                  {lemma}
                </button>
              )
            })}
          </div>

          {/* Right column — translations */}
          <div className="flex flex-1 flex-col gap-2">
            {shuffledRight.map(({ translation }) => {
              const matched = isRightMatched(translation)
              const matchedLemma = [...matches.entries()].find(([, v]) => v === translation)?.[0]
              const result = matchedLemma ? getMatchResult(matchedLemma) : null
              return (
                <button
                  key={translation}
                  onClick={() => handleRightTap(translation)}
                  disabled={revealed}
                  className={cn(
                    'rounded-xl border-2 px-3 py-3 text-center text-sm font-medium transition-all',
                    selectedRight === translation
                      ? 'border-gold bg-amber/20 text-brown'
                      : matched && !revealed
                      ? 'border-brown-muted/20 bg-cream-dark text-brown-muted'
                      : result === 'correct'
                      ? 'border-green-400 bg-green-50 text-green-800'
                      : result === 'wrong'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-brown-muted/20 bg-white text-brown hover:bg-cream-dark',
                  )}
                >
                  {translation}
                </button>
              )
            })}
          </div>
        </div>

        {/* Corrections — show after reveal */}
        {revealed && (
          <div className="mt-4 space-y-1">
            {pairs.map(({ lemma, translation }) => {
              const picked = matches.get(lemma)
              const correct = picked === translation
              if (correct) return null
              return (
                <p key={lemma} className="text-xs text-red-600">
                  <span className="font-medium">{lemma}</span> = {translation}
                  {picked && <span className="text-brown-muted"> (you picked: {picked})</span>}
                </p>
              )
            })}
          </div>
        )}
      </div>

      {/* Check / Next button */}
      {allMatched && !revealed && (
        <button
          onClick={handleCheck}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brown py-3.5 text-sm font-medium text-cream transition-all active:scale-[0.98]"
        >
          Check answers
        </button>
      )}
      {revealed && (
        <button
          onClick={handleNext}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brown py-3.5 text-sm font-medium text-cream transition-all active:scale-[0.98]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
