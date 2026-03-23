import { useState, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Languages } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { db, type Word } from '@/db/database'
import { cn } from '@/lib/utils'
import WordEditSheet from './WordEditSheet'

type Level = Word['level']
type Filter = 'all' | Level

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'known', label: 'Known' },
  { value: 'ignored', label: 'Ignored' },
]

const levelDot: Record<Level, string> = {
  new: 'bg-amber',
  learning: 'bg-orange',
  known: 'bg-green-400',
  ignored: 'bg-brown-muted/40',
}

interface LemmaGroup {
  lemma: string
  forms: Word[]
  level: Level
  translation?: string
}

export default function VocabularyView() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedGroup, setSelectedGroup] = useState<LemmaGroup | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  const allWords = useLiveQuery(() => db.words.toArray())

  // Compute counts per level
  const counts = useMemo(() => {
    if (!allWords) return { all: 0, new: 0, learning: 0, known: 0, ignored: 0 }
    const c = { all: allWords.length, new: 0, learning: 0, known: 0, ignored: 0 }
    for (const w of allWords) c[w.level]++
    return c
  }, [allWords])

  // Group by lemma, filter, search
  const groups = useMemo(() => {
    if (!allWords) return []

    const lemmaMap = new Map<string, Word[]>()
    for (const w of allWords) {
      const key = w.lemma
      const arr = lemmaMap.get(key)
      if (arr) arr.push(w)
      else lemmaMap.set(key, [w])
    }

    let result: LemmaGroup[] = []
    for (const [lemma, forms] of lemmaMap) {
      // Use the most common level among forms
      const level = forms[0].level
      const translation = forms.find(f => f.translation)?.translation
      result.push({ lemma, forms, level, translation })
    }

    // Filter by level
    if (filter !== 'all') {
      result = result.filter(g => g.level === filter)
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(g =>
        g.lemma.includes(q) ||
        g.forms.some(f => f.text.includes(q)) ||
        (g.translation?.toLowerCase().includes(q))
      )
    }

    // Sort alphabetically
    result.sort((a, b) => a.lemma.localeCompare(b.lemma, 'de'))

    return result
  }, [allWords, filter, search])

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  function handleTapGroup(group: LemmaGroup) {
    setSelectedGroup(group)
    setSheetOpen(true)
  }

  if (!allWords) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-brown-muted animate-pulse">Loading...</p>
      </div>
    )
  }

  if (allWords.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-cream-dark p-4">
          <Languages className="h-10 w-10 text-brown-muted" />
        </div>
        <p className="text-lg font-medium text-brown">No vocabulary yet</p>
        <p className="mt-1 text-sm text-brown-muted">Import a book and start reading to build your vocabulary</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-5 pb-2 pt-[env(safe-area-inset-top,16px)]">
        <h1 className="mb-3 text-2xl font-bold text-brown">Vocabulary</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
          <Input
            className="pl-9"
            placeholder="Search words..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filter === value
                  ? 'bg-brown text-cream'
                  : 'bg-cream-dark text-brown-muted hover:text-brown'
              )}
            >
              {label} <span className="ml-0.5 opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Word list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto px-4">
        {groups.length === 0 ? (
          <p className="mt-8 text-center text-sm text-brown-muted">No words match your search</p>
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map(virtualRow => {
              const group = groups[virtualRow.index]
              return (
                <button
                  key={group.lemma}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  onClick={() => handleTapGroup(group)}
                  className="absolute left-0 top-0 w-full text-left"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex items-center gap-3 border-b border-brown-muted/8 px-1 py-3">
                    <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', levelDot[group.level])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brown">{group.lemma}</p>
                      {group.forms.length > 1 && (
                        <p className="truncate text-xs text-brown-muted">
                          {group.forms.map(f => f.text).filter(t => t !== group.lemma).join(', ')}
                        </p>
                      )}
                    </div>
                    {group.translation && (
                      <p className="flex-shrink-0 text-right text-xs text-brown-muted max-w-[40%] truncate">
                        {group.translation}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <WordEditSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedGroup(null) }}
        group={selectedGroup}
      />
    </div>
  )
}
