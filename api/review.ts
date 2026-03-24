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

    // Translation mode (for languages DeepL doesn't support)
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
1. A natural ${language} sentence using that word (B1 level, 8-15 words)
2. The English translation of that sentence
3. Three distractor words that could plausibly fill the blank (same part of speech, similar difficulty)

Respond in JSON format only, no markdown:
[
  {
    "lemma": "the word",
    "sentence": "full ${language} sentence with the word",
    "translation": "English translation of the sentence",
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
