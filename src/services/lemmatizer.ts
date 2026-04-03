import type { Language } from '@/db/database'

const lemmaMaps = new Map<Language, Map<string, string>>()
const knownWordSets = new Map<Language, Set<string>>()
const loadingPromises = new Map<Language, Promise<Map<string, string>>>()

async function loadLemmaMap(lang: Language): Promise<Map<string, string>> {
  const response = await fetch(`/lemma-${lang}.tsv`)
  const text = await response.text()
  const map = new Map<string, string>()
  const known = new Set<string>()

  const lines = text.split('\n')
  for (const line of lines) {
    const tabIndex = line.indexOf('\t')
    if (tabIndex === -1) continue
    const lemma = line.slice(0, tabIndex).trim().toLowerCase()
    const inflected = line.slice(tabIndex + 1).trim().toLowerCase()
    if (lemma && inflected) {
      if (!map.has(inflected)) map.set(inflected, lemma)
      known.add(lemma)
      known.add(inflected)
    }
  }

  knownWordSets.set(lang, known)
  return map
}

export async function initLemmatizer(lang: Language = 'de'): Promise<void> {
  if (lemmaMaps.has(lang)) return
  if (!loadingPromises.has(lang)) {
    loadingPromises.set(lang, loadLemmaMap(lang))
  }
  const map = await loadingPromises.get(lang)!
  lemmaMaps.set(lang, map)
}

export function getLemma(word: string, lang: Language = 'de'): string {
  const map = lemmaMaps.get(lang)
  if (!map) return word.toLowerCase()
  const lower = word.toLowerCase()
  return map.get(lower) ?? lower
}

export function isLemmatizerReady(lang: Language = 'de'): boolean {
  return lemmaMaps.has(lang)
}

/** Check if a word is known in the target language dictionary */
export function isKnownWord(word: string, lang: Language = 'de'): boolean {
  const known = knownWordSets.get(lang)
  if (!known) return false
  return known.has(word.toLowerCase())
}
