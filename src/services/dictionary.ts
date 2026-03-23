import { db } from '@/db/database'

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'
const API_KEY = import.meta.env.VITE_DEEPL_API_KEY as string | undefined

interface DeepLResponse {
  translations: { text: string }[]
}

export async function translateWord(word: string): Promise<string | null> {
  // Check cache first
  const cached = await db.words.where('text').equals(word.toLowerCase()).first()
  if (cached?.translation) return cached.translation

  const result = await callDeepL(word)
  if (result) {
    // Cache the translation
    await db.words.where('text').equals(word.toLowerCase()).modify({ translation: result })
  }
  return result
}

export async function translateSentence(sentence: string): Promise<string | null> {
  return callDeepL(sentence)
}

async function callDeepL(text: string): Promise<string | null> {
  if (!API_KEY) return null

  try {
    const res = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'DE',
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

export function getDictCcUrl(word: string): string {
  return `https://www.dict.cc/?s=${encodeURIComponent(word)}`
}

export function hasApiKey(): boolean {
  return !!API_KEY
}
