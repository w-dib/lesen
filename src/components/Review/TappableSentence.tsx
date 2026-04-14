import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Word } from '@/db/database'
import { cn } from '@/lib/utils'

interface Token {
  pre: string
  word: string
  post: string
  key: string
}

/** Tokenize a sentence preserving punctuation and spacing, so we can render the
 * sentence exactly while making each word individually clickable. */
function tokenize(sentence: string): Token[] {
  const tokens: Token[] = []
  const re = /(\s*)([\p{L}\p{M}'-]+)([^\s\p{L}\p{M}'-]*)/gu
  let match: RegExpExecArray | null
  let idx = 0
  while ((match = re.exec(sentence)) !== null) {
    tokens.push({
      pre: match[1] ?? '',
      word: match[2] ?? '',
      post: match[3] ?? '',
      key: `${idx++}-${match[2]}`,
    })
  }
  return tokens
}

const levelBg: Record<string, string> = {
  new: 'bg-amber/60',
  learning: 'bg-orange/60',
  known: '',
  ignored: '',
}

interface TappableSentenceProps {
  sentence: string
  onTapWord: (wordText: string, existingWord: Word | undefined) => void
  className?: string
  /** Highlight underline the blank placeholder "______" instead of treating it as word. */
  blankMarker?: string
}

export default function TappableSentence({
  sentence,
  onTapWord,
  className,
  blankMarker = '______',
}: TappableSentenceProps) {
  const tokens = useMemo(() => tokenize(sentence), [sentence])

  // Query DB for any words whose text matches what we tokenised (lowercased)
  const lowered = useMemo(() => tokens.map(t => t.word.toLowerCase()), [tokens])
  const wordRecords = useLiveQuery(
    async () => {
      if (lowered.length === 0) return new Map<string, Word>()
      const rows = await db.words.where('text').anyOf(lowered).toArray()
      return new Map(rows.map(w => [w.text, w]))
    },
    [lowered.join('|')],
  )

  return (
    <span className={className}>
      {tokens.map(tok => {
        // Render the blank marker as non-interactive
        if (tok.word === blankMarker || tok.word.replace(/_/g, '') === '') {
          return (
            <span key={tok.key}>
              {tok.pre}
              {tok.word}
              {tok.post}
            </span>
          )
        }

        const existing = wordRecords?.get(tok.word.toLowerCase())
        const bgClass = existing ? levelBg[existing.level] ?? '' : ''
        const dimmed = existing?.level === 'ignored'

        return (
          <span key={tok.key}>
            {tok.pre}
            <span
              role="button"
              tabIndex={0}
              onClick={() => onTapWord(tok.word, existing)}
              className={cn(
                'cursor-pointer rounded-sm px-[1px] transition-colors',
                bgClass,
                dimmed && 'opacity-50',
                !bgClass && 'hover:bg-cream-dark',
              )}
            >
              {tok.word}
            </span>
            {tok.post}
          </span>
        )
      })}
    </span>
  )
}
