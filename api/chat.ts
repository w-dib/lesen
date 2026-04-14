import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ReviewContext {
  lemma?: string
  translation?: string
  sentence?: string
  translationSentence?: string
  exerciseType?: string
  language?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'DeepSeek API key not configured' })
  }

  const { messages, context } = req.body as { messages: ChatMessage[]; context?: ReviewContext }

  const lang = context?.language || 'German'
  const parts: string[] = [
    `You are a friendly, concise ${lang} language tutor. Answer the user's questions about vocabulary, grammar, and usage in a warm, clear way. Keep responses short (2-4 sentences max unless explicitly asked for more). Use plain text — no markdown headers or bullet lists unless specifically useful.`,
  ]
  if (context?.lemma) {
    parts.push(`The user is currently reviewing the ${lang} word "${context.lemma}"${context.translation ? ` (meaning: "${context.translation}")` : ''}.`)
  }
  if (context?.sentence) {
    parts.push(`Example sentence: "${context.sentence}"${context.translationSentence ? ` — which means: "${context.translationSentence}"` : ''}.`)
  }
  if (context?.exerciseType) {
    parts.push(`Exercise type: ${context.exerciseType}.`)
  }
  const systemPrompt = parts.join(' ')

  try {
    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    if (!deepseekRes.ok || !deepseekRes.body) {
      const text = await deepseekRes.text()
      return res.status(deepseekRes.status || 500).json({ error: text })
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = deepseekRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) res.write(delta)
        } catch {
          // skip malformed chunk
        }
      }
    }

    res.end()
  } catch {
    if (!res.headersSent) res.status(500).json({ error: 'Chat request failed' })
    else res.end()
  }
}
