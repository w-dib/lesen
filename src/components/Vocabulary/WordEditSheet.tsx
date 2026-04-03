import { useState, useCallback } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Wand2, Loader2, Unlink } from 'lucide-react'
import { db, type Word } from '@/db/database'
import { translateWord } from '@/services/dictionary'
import { getLemma, initLemmatizer } from '@/services/lemmatizer'
import { getDefaultLanguage } from '@/components/Settings/SettingsView'
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
  const [translating, setTranslating] = useState(false)

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
            {group.forms.map(f => {
              const correctLemma = getLemma(f.text, getDefaultLanguage()) || f.text.toLowerCase()
              const isMisGrouped = correctLemma !== group.lemma && f.text.toLowerCase() !== group.lemma
              return (
                <span
                  key={f.id}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                    isMisGrouped ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-cream-dark text-brown'
                  )}
                >
                  {f.text}
                  {isMisGrouped && (
                    <button
                      title={`Detach — move to "${correctLemma}"`}
                      onClick={async () => {
                        await initLemmatizer(getDefaultLanguage())
                        await db.words.update(f.id, {
                          lemma: correctLemma,
                          translation: undefined,
                          updatedAt: new Date(),
                        })
                      }}
                      className="ml-0.5 rounded p-0.5 hover:bg-red-100"
                    >
                      <Unlink className="h-3 w-3" />
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        </div>

        {/* Translation */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-brown-muted">Translation</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={editTranslation}
                onChange={e => { setEditTranslation(e.target.value); setDirty(true) }}
                placeholder="Enter translation"
                className="pr-24"
              />
              <button
                onClick={async () => {
                  setTranslating(true)
                  const result = await translateWord(group.lemma)
                  if (result) {
                    setEditTranslation(result)
                    setDirty(true)
                  }
                  setTranslating(false)
                }}
                disabled={translating}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-cream-dark px-2 py-1 text-xs font-medium text-brown-muted transition-colors hover:bg-amber/20 hover:text-brown disabled:opacity-50"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Translate
              </button>
            </div>
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
