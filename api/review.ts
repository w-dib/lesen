import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'DeepSeek API key not configured' })
  }

  try {
    const body = req.body

    // Word lookup mode: lemma correction + translation in one call
    if (body.lookup) {
      const { word, sentence, language } = body as { word: string; sentence: string; language: string }
      const prompt = `You are a ${language} language expert. The user tapped the word "${word}" in this sentence: "${sentence}"

Identify the correct full infinitive/dictionary form of this word in context (e.g. for German separable verbs like "rufe...an" → "anrufen"). Then translate it to English.

Respond in JSON only, no markdown:
{"lemma": "correct dictionary form", "translation": "English translation"}`

      const response = await callDeepSeek(apiKey, prompt, 100)
      if (!response.ok) {
        return res.status(response.status).json({ error: await response.text() })
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || '{}'
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const result = JSON.parse(jsonStr)
      return res.status(200).json(result)
    }

    // Translation mode
    if (body.translate) {
      const { text, language } = body as { text: string; language: string }
      const prompt = `Translate the following ${language} text to English. Reply with ONLY the translation, nothing else:\n\n${text}`

      const response = await callDeepSeek(apiKey, prompt, 200)
      if (!response.ok) {
        return res.status(response.status).json({ error: await response.text() })
      }

      const data = await response.json()
      const translation = data.choices?.[0]?.message?.content?.trim() || null
      return res.status(200).json({ translation })
    }

    // Review exercise mode
    const { words, language = 'German' } = body as {
      words: { lemma: string; translation?: string }[]
      language?: string
    }

    const wordList = words.map(w => `${w.lemma}${w.translation ? ` (${w.translation})` : ''}`).join(', ')

    const prompt = `You are a ${language} language tutor. Generate review exercises for these ${language} words: ${wordList}

For each word, create:
1. A natural ${language} sentence using the EXACT lemma form of the word (B1 level, 8-15 words). The sentence MUST contain the exact lemma as given above.
2. The same sentence but with the target word replaced by "______" (six underscores). IMPORTANT: double-check the word is actually removed and not still visible.
3. The English translation of the sentence.
4. Three distractor words: same part of speech and difficulty, but SEMANTICALLY UNRELATED. Do NOT use synonyms, antonyms, or words from the same topic. Example: if the answer is "schnell", do NOT use "langsam" or "beeilen" — use unrelated words like "wichtig", "freundlich", "müde".

Respond in JSON format only, no markdown:
[
  {
    "lemma": "the word",
    "sentence": "full sentence with the exact lemma",
    "blanked": "same sentence with ______ replacing the word",
    "translation": "English translation",
    "distractors": ["word1", "word2", "word3"]
  }
]`

    const response = await callDeepSeek(apiKey, prompt, 2000)
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const exercises = JSON.parse(jsonStr)

    return res.status(200).json({ exercises })
  } catch {
    return res.status(500).json({ error: 'Failed to process request' })
  }
}

function callDeepSeek(apiKey: string, prompt: string, maxTokens: number) {
  return fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  })
}
