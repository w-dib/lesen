import type { Language } from '@/db/database'

const LANG_NAMES: Record<Language, string> = {
  de: 'German',
  af: 'Afrikaans',
  ru: 'Russian',
}

interface LookupResult {
  lemma: string
  translation: string
}

/**
 * Smart word lookup: sends the tapped word + full sentence to DeepSeek,
 * which returns the correct lemma (handling separable verbs etc.) and translation.
 */
export async function lookupWord(
  word: string,
  sentence: string,
  lang: Language = 'de',
): Promise<LookupResult | null> {
  try {
    const langName = LANG_NAMES[lang]
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lookup: true,
        word,
        sentence,
        language: langName,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.lemma && data.translation ? data : null
  } catch {
    return null
  }
}

/**
 * Translate a full sentence.
 */
export async function translateSentence(sentence: string, lang: Language = 'de'): Promise<string | null> {
  try {
    const langName = LANG_NAMES[lang]
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        translate: true,
        text: sentence,
        language: langName,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.translation ?? null
  } catch {
    return null
  }
}

/**
 * Translate a single word (used in vocab edit sheet — no sentence context available).
 */
export async function translateWord(word: string, lang: Language = 'de'): Promise<string | null> {
  return translateSentence(word, lang)
}

export function getDictUrl(word: string, lang: Language = 'de'): { url: string; label: string } {
  switch (lang) {
    case 'de':
      return { url: `https://www.dict.cc/?s=${encodeURIComponent(word)}`, label: 'dict.cc' }
    case 'ru':
      return { url: `https://en.openrussian.org/ru/${encodeURIComponent(word)}`, label: 'OpenRussian' }
    case 'af':
      return { url: `https://www.lexilogos.com/english/afrikaans_dictionary.htm?q=${encodeURIComponent(word)}`, label: 'Lexilogos' }
  }
}
