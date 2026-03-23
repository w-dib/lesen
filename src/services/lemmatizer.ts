let lemmaMap: Map<string, string> | null = null
let loadingPromise: Promise<Map<string, string>> | null = null

async function loadLemmaMap(): Promise<Map<string, string>> {
  const response = await fetch('/lemma-de.tsv')
  const text = await response.text()
  const map = new Map<string, string>()

  const lines = text.split('\n')
  for (const line of lines) {
    const tabIndex = line.indexOf('\t')
    if (tabIndex === -1) continue
    const lemma = line.slice(0, tabIndex).trim().toLowerCase()
    const inflected = line.slice(tabIndex + 1).trim().toLowerCase()
    if (lemma && inflected && !map.has(inflected)) {
      map.set(inflected, lemma)
    }
  }

  return map
}

export async function initLemmatizer(): Promise<void> {
  if (lemmaMap) return
  if (!loadingPromise) {
    loadingPromise = loadLemmaMap()
  }
  lemmaMap = await loadingPromise
}

export function getLemma(word: string): string {
  if (!lemmaMap) return word.toLowerCase()
  const lower = word.toLowerCase()
  return lemmaMap.get(lower) ?? lower
}

export function isLemmatizerReady(): boolean {
  return lemmaMap !== null
}
