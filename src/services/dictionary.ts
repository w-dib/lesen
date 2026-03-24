import { db, type Language } from '@/db/database'

const API_KEY = import.meta.env.VITE_DEEPL_API_KEY as string | undefined

// DeepL source language codes
const DEEPL_SOURCE: Record<Language, string> = {
  de: 'DE',
  af: 'AF', // Not supported by DeepL — will fallback
  ru: 'RU',
}

// DeepL doesn't support Afrikaans
const DEEPL_SUPPORTED: Set<Language> = new Set(['de', 'ru'])

interface DeepLResponse {
  translations: { text: string }[]
}

export async function translateWord(word: string, lang: Language = 'de'): Promise<string | null> {
  // Check cache first
  const cached = await db.words.where('text').equals(word.toLowerCase()).first()
  if (cached?.translation) return cached.translation

  const result = await callTranslate(word, lang)
  if (result) {
    await db.words.where('text').equals(word.toLowerCase()).modify({ translation: result })
  }
  return result
}

export async function translateSentence(sentence: string, lang: Language = 'de'): Promise<string | null> {
  return callTranslate(sentence, lang)
}

async function callTranslate(text: string, lang: Language): Promise<string | null> {
  if (DEEPL_SUPPORTED.has(lang)) {
    return callDeepL(text, lang)
  }
  // Fallback: use DeepSeek for unsupported languages
  return callDeepSeekTranslate(text, lang)
}

async function callDeepL(text: string, lang: Language): Promise<string | null> {
  if (!API_KEY) return null

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: DEEPL_SOURCE[lang],
        target_lang: 'EN',
      }),
    })

    if (!res.ok) return null

    const data: DeepLResponse = await res.json()
    return data.translations?.[0]?.text ?? null
  } catch {
    return null
  }
}

async function callDeepSeekTranslate(text: string, lang: Language): Promise<string | null> {
  try {
    const langName = lang === 'af' ? 'Afrikaans' : lang === 'ru' ? 'Russian' : 'German'
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        translate: true,
        text,
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

export function hasApiKey(): boolean {
  return !!API_KEY
}
