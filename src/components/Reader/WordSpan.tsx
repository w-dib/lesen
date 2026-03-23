import { memo } from 'react'
import type { Word } from '@/db/database'
import type { Token } from '@/services/textProcessor'
import { cn } from '@/lib/utils'

const levelColors: Record<string, string> = {
  new: 'bg-amber',
  learning: 'bg-orange',
  known: '',
  ignored: '',
}

interface WordSpanProps {
  token: Token
  word?: Word
  onTap: () => void
}

export const WordSpan = memo(function WordSpan({ token, word, onTap }: WordSpanProps) {
  const level = word?.level ?? 'new'
  const bgClass = levelColors[level] ?? ''
  const dimmed = level === 'ignored'

  return (
    <>
      {token.pre && (
        <span className="whitespace-pre-wrap font-serif">{token.pre}</span>
      )}
      <span
        role="button"
        tabIndex={0}
        onClick={onTap}
        className={cn(
          'cursor-pointer rounded-sm px-[1px] font-serif transition-colors duration-200',
          bgClass,
          dimmed && 'opacity-50'
        )}
      >
        {token.word}
      </span>
      {token.post && (
        <span className="font-serif">{token.post}</span>
      )}
    </>
  )
})
