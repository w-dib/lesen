import { useState, useEffect, useCallback } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2, MessageSquareQuote } from 'lucide-react'
import { db, type Word, type Language } from '@/db/database'
import { translateWord, translateSentence, getDictUrl, hasApiKey } from '@/services/dictionary'
import { cn } from '@/lib/utils'

type Level = Word['level']

const levels: { value: Level; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-amber' },
  { value: 'learning', label: 'Learning', color: 'bg-orange' },
  { value: 'known', label: 'Known', color: 'bg-cream-dark' },
  { value: 'ignored', label: 'Ignored', color: 'bg-cream-dark' },
]

interface WordBottomSheetProps {
  open: boolean
  onClose: () => void
  word?: Word
  sentence?: string
  language?: Language
}

export default function WordBottomSheet({ open, onClose, word, sentence, language = 'de' }: WordBottomSheetProps) {
  const [translation, setTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [sentenceTranslation, setSentenceTranslation] = useState<string | null>(null)
  const [translatingSentence, setTranslatingSentence] = useState(false)

  useEffect(() => {
    if (!open || !word) {
      setTranslation(null)
      setSentenceTranslation(null)
      return
    }

    // Show cached translation immediately
    if (word.translation) {
      setTranslation(word.translation)
      return
    }

    // Fetch from DeepL
    setTranslating(true)
    translateWord(word.text, language).then(result => {
      setTranslation(result)
      setTranslating(false)
    })
  }, [open, word])

  const handleTranslateSentence = useCallback(async () => {
    if (!sentence) return
    setTranslatingSentence(true)
    const result = await translateSentence(sentence, language)
    setSentenceTranslation(result)
    setTranslatingSentence(false)
  }, [sentence])

  const handleLevelChange = useCallback(async (newLevel: Level) => {
    if (!word) return
    const now = new Date()

    // Update all words sharing the same lemma
    await db.words
      .where('lemma')
      .equals(word.lemma)
      .modify({ level: newLevel, updatedAt: now })
  }, [word])

  // Increment lookup count on open
  useEffect(() => {
    if (!open || !word) return
    db.words.update(word.id, {
      lookupCount: word.lookupCount + 1,
      lastLookedUp: new Date(),
    })
  }, [open, word?.id])

  if (!word) return null

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-6 pt-5">
        {/* Drag handle */}
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-brown-muted/30" />
        </div>

        {/* Word + lemma */}
        <div className="mb-4">
          <p className="font-serif text-2xl font-bold text-brown">{word.text}</p>
          {word.lemma !== word.text && (
            <p className="mt-0.5 text-sm text-brown-muted">
              {word.text} <span className="mx-1">&rarr;</span>
              <span className="font-medium text-brown">{word.lemma}</span>
            </p>
          )}
        </div>

        {/* Translation */}
        <div className="mb-4 rounded-lg border border-brown-muted/15 bg-white p-3">
          {translating ? (
            <div className="flex items-center gap-2 text-sm text-brown-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Translating...
            </div>
          ) : translation ? (
            <p className="text-sm text-brown">{translation}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-brown-muted">
                {hasApiKey() ? 'No translation found' : 'No API key configured'}
              </p>
              {(() => {
                const { url, label } = getDictUrl(word.lemma, language)
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
                  >
                    Search on {label} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )
              })()}
            </div>
          )}
        </div>

        {/* Translate sentence */}
        {sentence && (
          <div className="mb-4">
            {sentenceTranslation ? (
              <div className="rounded-lg border border-brown-muted/15 bg-cream-dark/50 p-3">
                <p className="mb-1 text-xs font-medium text-brown-muted">Sentence</p>
                <p className="text-sm italic text-brown">{sentence}</p>
                <p className="mt-2 text-sm text-brown">{sentenceTranslation}</p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleTranslateSentence}
                disabled={translatingSentence}
              >
                {translatingSentence ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Translating sentence...
                  </>
                ) : (
                  <>
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                    Translate full sentence
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Level selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-brown-muted">Word level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {levels.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => handleLevelChange(value)}
                className={cn(
                  'rounded-lg px-2 py-2 text-xs font-medium transition-all',
                  word.level === value
                    ? 'ring-2 ring-gold ring-offset-1 ring-offset-cream'
                    : 'opacity-70 hover:opacity-100',
                  color,
                  value === 'new' && 'text-brown',
                  value === 'learning' && 'text-brown',
                  value === 'known' && 'text-brown-muted',
                  value === 'ignored' && 'text-brown-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
