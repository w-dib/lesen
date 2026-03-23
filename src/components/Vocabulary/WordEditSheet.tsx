import { useState, useCallback } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { db, type Word } from '@/db/database'
import { cn } from '@/lib/utils'

type Level = Word['level']

const levels: { value: Level; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-amber' },
  { value: 'learning', label: 'Learning', color: 'bg-orange' },
  { value: 'known', label: 'Known', color: 'bg-cream-dark' },
  { value: 'ignored', label: 'Ignored', color: 'bg-cream-dark' },
]

interface LemmaGroup {
  lemma: string
  forms: Word[]
  level: Level
  translation?: string
}

interface WordEditSheetProps {
  open: boolean
  onClose: () => void
  group: LemmaGroup | null
}

export default function WordEditSheet({ open, onClose, group }: WordEditSheetProps) {
  const [editTranslation, setEditTranslation] = useState('')
  const [dirty, setDirty] = useState(false)

  // Sync local state when group changes
  const translation = group?.translation ?? ''
  if (open && !dirty && editTranslation !== translation) {
    setEditTranslation(translation)
  }

  function handleClose() {
    setDirty(false)
    onClose()
  }

  const handleLevelChange = useCallback(async (newLevel: Level) => {
    if (!group) return
    await db.words
      .where('lemma')
      .equals(group.lemma)
      .modify({ level: newLevel, updatedAt: new Date() })
  }, [group])

  const handleSaveTranslation = useCallback(async () => {
    if (!group) return
    await db.words
      .where('lemma')
      .equals(group.lemma)
      .modify({ translation: editTranslation, updatedAt: new Date() })
    setDirty(false)
  }, [group, editTranslation])

  if (!group) return null

  const bookCount = new Set(group.forms.flatMap(f => f.bookIds)).size

  return (
    <Sheet open={open} onClose={handleClose} title={group.lemma}>
      <div className="flex flex-col gap-5 px-5 pb-6 pt-4">
        {/* Forms */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-brown-muted">Inflected forms encountered</p>
          <div className="flex flex-wrap gap-1.5">
            {group.forms.map(f => (
              <span
                key={f.id}
                className="rounded-md bg-cream-dark px-2 py-1 text-xs text-brown"
              >
                {f.text}
              </span>
            ))}
          </div>
        </div>

        {/* Translation */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-brown-muted">Translation</p>
          <div className="flex gap-2">
            <Input
              value={editTranslation}
              onChange={e => { setEditTranslation(e.target.value); setDirty(true) }}
              placeholder="Enter translation"
            />
            {dirty && (
              <Button size="sm" onClick={handleSaveTranslation}>Save</Button>
            )}
          </div>
        </div>

        {/* Level */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-brown-muted">Level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {levels.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => handleLevelChange(value)}
                className={cn(
                  'rounded-lg px-2 py-2 text-xs font-medium transition-all',
                  group.level === value
                    ? 'ring-2 ring-gold ring-offset-1 ring-offset-cream'
                    : 'opacity-70 hover:opacity-100',
                  color,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Meta */}
        <p className="text-xs text-brown-muted">
          Appears in {bookCount} book{bookCount !== 1 ? 's' : ''} &middot;{' '}
          {group.forms.reduce((s, f) => s + f.lookupCount, 0)} lookups
        </p>
      </div>
    </Sheet>
  )
}
