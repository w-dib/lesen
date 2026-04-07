import { useState, useMemo } from 'react'
import { Check, X, ArrowRight, Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BuilderExerciseProps {
  /** Target German sentence (with the lemma in it). */
  sentence: string
  /** English translation shown as the prompt. */
  translation: string
  /** Optional distractor words to mix into the bag. */
  distractors?: string[]
  onComplete: (correct: boolean) => void
  onAdvance: () => void
}

/** Tokenize a sentence into individual words, dropping punctuation. */
function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[.,!?;:„"""''()\[\]]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
}

/** Normalize a token for comparison: lowercase + strip punctuation. */
function norm(token: string): string {
  return token.toLowerCase().replace(/[.,!?;:„"""''()\[\]]/g, '')
}

interface BagWord {
  id: number // unique id so duplicate words don't collide
  text: string
}

export default function BuilderExercise({
  sentence,
  translation,
  distractors = [],
  onComplete,
  onAdvance,
}: BuilderExerciseProps) {
  const targetTokens = useMemo(() => tokenize(sentence), [sentence])

  // Build the word bag: target words + a couple of distractors, shuffled, with stable ids
  const initialBag = useMemo(() => {
    const distractorTokens = distractors.slice(0, 2).flatMap(d => tokenize(d))
    const all = [...targetTokens, ...distractorTokens]
    return all
      .map((text, idx) => ({ id: idx, text }))
      .sort(() => Math.random() - 0.5)
  }, [targetTokens, distractors])

  const [bag, setBag] = useState<BagWord[]>(initialBag)
  const [built, setBuilt] = useState<BagWord[]>([])
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  function tapBag(word: BagWord) {
    if (revealed) return
    setBag(prev => prev.filter(w => w.id !== word.id))
    setBuilt(prev => [...prev, word])
  }

  function tapBuilt(word: BagWord) {
    if (revealed) return
    setBuilt(prev => prev.filter(w => w.id !== word.id))
    setBag(prev => [...prev, word])
  }

  function handleSubmit() {
    if (built.length === 0) return
    const builtNorm = built.map(w => norm(w.text))
    const targetNorm = targetTokens.map(norm)
    const correct =
      builtNorm.length === targetNorm.length &&
      builtNorm.every((w, i) => w === targetNorm[i])
    setIsCorrect(correct)
    setRevealed(true)
    onComplete(correct)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Prompt */}
      <div className="mt-2 rounded-2xl border border-brown-muted/15 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brown-muted">
          Build the sentence
        </p>
        <p className="text-base font-medium text-brown">{translation}</p>
      </div>

      {/* Build area */}
      <div
        className={cn(
          'mt-4 min-h-[88px] rounded-2xl border-2 border-dashed p-3',
          revealed
            ? isCorrect
              ? 'border-green-400 bg-green-50'
              : 'border-red-300 bg-red-50'
            : 'border-brown-muted/25 bg-white',
        )}
      >
        {built.length === 0 ? (
          <p className="flex h-full min-h-[64px] items-center justify-center text-xs text-brown-muted">
            Tap words below to build your answer
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {built.map(word => (
              <button
                key={word.id}
                onClick={() => tapBuilt(word)}
                disabled={revealed}
                className={cn(
                  'rounded-lg border border-brown-muted/20 bg-cream-dark px-3 py-2 text-sm font-medium text-brown shadow-sm transition-all',
                  !revealed && 'active:scale-95 hover:bg-amber/20',
                )}
              >
                {word.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word bag */}
      <div className="mt-3 rounded-2xl border border-brown-muted/10 bg-cream-dark/40 p-3">
        <div className="flex flex-wrap gap-2">
          {bag.map(word => (
            <button
              key={word.id}
              onClick={() => tapBag(word)}
              disabled={revealed}
              className={cn(
                'rounded-lg border border-brown-muted/20 bg-white px-3 py-2 text-sm font-medium text-brown shadow-sm transition-all',
                !revealed && 'active:scale-95 hover:bg-amber/20',
                revealed && 'opacity-40',
              )}
            >
              {word.text}
            </button>
          ))}
          {bag.length === 0 && (
            <p className="px-1 py-2 text-xs text-brown-muted">All words used</p>
          )}
        </div>
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="mt-4">
          {isCorrect ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" /> Correct!
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-red-700">
                <X className="h-4 w-4" /> Not quite
              </div>
              <p className="mt-1 text-xs text-brown-muted">Correct answer:</p>
              <p className="mt-0.5 text-sm text-brown">{sentence}</p>
            </div>
          )}
        </div>
      )}

      {/* Submit / Next button */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={built.length === 0}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-[0.98]',
            built.length === 0
              ? 'bg-cream-dark text-brown-muted'
              : 'bg-brown text-cream',
          )}
        >
          {built.length === 0 ? (
            <>
              <Delete className="h-4 w-4" /> Tap words to build
            </>
          ) : (
            'Submit'
          )}
        </button>
      ) : (
        <button
          onClick={onAdvance}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brown py-3.5 text-sm font-medium text-cream transition-all active:scale-[0.98]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
