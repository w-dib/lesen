import { useState, useEffect, useRef } from 'react'
import { Volume2, Check, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Language } from '@/db/database'

const LANG_BCP47: Record<Language, string> = { de: 'de-DE', af: 'af-ZA', ru: 'ru-RU', ar: 'ar-SA' }

interface ListenExerciseProps {
  /** Target German sentence to play and check against. */
  sentence: string
  /** English translation, shown only after reveal. */
  translation: string
  language?: Language
  onComplete: (correct: boolean) => void
  onAdvance: () => void
}

/** Normalize text for comparison: lowercase, strip punctuation, collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:„"""''()\[\]\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function speak(text: string, lang: Language) {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_BCP47[lang] ?? 'de-DE'
  utterance.rate = 0.85
  speechSynthesis.speak(utterance)
}

export default function ListenExercise({
  sentence,
  translation,
  language = 'de',
  onComplete,
  onAdvance,
}: ListenExerciseProps) {
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const playedOnce = useRef(false)

  // Auto-play once on mount + focus input
  useEffect(() => {
    if (playedOnce.current) return
    playedOnce.current = true
    // Small delay so the sheet animation doesn't fight with TTS
    const t = setTimeout(() => speak(sentence, language), 250)
    inputRef.current?.focus()
    return () => clearTimeout(t)
  }, [sentence, language])

  function handleSubmit() {
    if (!input.trim()) return
    const correct = normalize(input) === normalize(sentence)
    setIsCorrect(correct)
    setRevealed(true)
    onComplete(correct)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Prompt */}
      <div className="mt-2 rounded-2xl border border-brown-muted/15 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brown-muted">
          Listen and type what you hear
        </p>
        <button
          onClick={() => speak(sentence, language)}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-amber/20 py-5 text-brown transition-all active:scale-[0.98] hover:bg-amber/30"
        >
          <Volume2 className="h-7 w-7" />
          <span className="text-sm font-medium">Play again</span>
        </button>
      </div>

      {/* Input */}
      <div className="mt-4">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={revealed}
          placeholder="Type what you heard..."
          rows={3}
          className={cn(
            'w-full rounded-xl border-2 bg-white p-3 text-base text-brown placeholder:text-brown-muted/60 focus:outline-none focus:ring-2 focus:ring-gold',
            revealed
              ? isCorrect
                ? 'border-green-400 bg-green-50'
                : 'border-red-300 bg-red-50'
              : 'border-brown-muted/20',
          )}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !revealed) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="mt-3">
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
          <p className="mt-2 text-xs italic text-brown-muted">{translation}</p>
        </div>
      )}

      {/* Submit / Next button */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-[0.98]',
            !input.trim()
              ? 'bg-cream-dark text-brown-muted'
              : 'bg-brown text-cream',
          )}
        >
          Submit
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
