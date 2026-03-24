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
    const { words } = req.body as { words: { lemma: string; translation?: string }[] }

    const wordList = words.map(w => `${w.lemma}${w.translation ? ` (${w.translation})` : ''}`).join(', ')

    const prompt = `You are a German language tutor. Generate review exercises for these German words: ${wordList}

For each word, create:
1. A natural German sentence using that word (B1 level, 8-15 words)
2. The English translation of that sentence
3. Three distractor words that could plausibly fill the blank (same part of speech, similar difficulty)

Respond in JSON format only, no markdown:
[
  {
    "lemma": "the word",
    "sentence": "full German sentence with the word",
    "translation": "English translation of the sentence",
    "distractors": ["word1", "word2", "word3"]
  }
]`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'

    // Parse the JSON from the response (strip markdown fences if present)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const exercises = JSON.parse(jsonStr)

    return res.status(200).json({ exercises })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate review exercises' })
  }
}
