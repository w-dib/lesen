import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Word } from '@/db/database'
import { cn } from '@/lib/utils'

type Segment =
  | { type: 'word'; text: string; key: string }
  | { type: 'text'; text: string; key: string }

/** Split a sentence into alternating word / non-word segments so we can make
 * each word clickable while preserving punctuation, whitespace, and markers
 * like "______". */
function parseSegments(sentence: string): Segment[] {
  const segments: Segment[] = []
  const re = /([\p{L}\p{M}'-]+)|([^\p{L}\p{M}'-]+)/gu
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(sentence)) !== null) {
    if (match[1]) {
      segments.push({ type: 'word', text: match[1], key: `w${i++}-${match[1]}` })
    } else if (match[2]) {
      segments.push({ type: 'text', text: match[2], key: `t${i++}` })
    }
  }
  return segments
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
}

export default function TappableSentence({
  sentence,
  onTapWord,
  className,
}: TappableSentenceProps) {
  const segments = useMemo(() => parseSegments(sentence), [sentence])

  // Query DB for any words whose text matches what we parsed (lowercased)
  const lowered = useMemo(
    () => segments.filter(s => s.type === 'word').map(s => s.text.toLowerCase()),
    [segments],
  )
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
      {segments.map(seg => {
        if (seg.type === 'text') {
          return <span key={seg.key}>{seg.text}</span>
        }

        const existing = wordRecords?.get(seg.text.toLowerCase())
        const bgClass = existing ? levelBg[existing.level] ?? '' : ''
        const dimmed = existing?.level === 'ignored'

        return (
          <span
            key={seg.key}
            role="button"
            tabIndex={0}
            onClick={() => onTapWord(seg.text, existing)}
            className={cn(
              'cursor-pointer rounded-sm px-[1px] transition-colors',
              bgClass,
              dimmed && 'opacity-50',
              !bgClass && 'hover:bg-cream-dark',
            )}
          >
            {seg.text}
          </span>
        )
      })}
    </span>
  )
}
