export const config = { runtime: 'edge' }

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DeepSeek API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { messages: ChatMessage[]; context?: ReviewContext }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { messages, context } = body
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
    const errText = await deepseekRes.text()
    return new Response(JSON.stringify({ error: errText }), {
      status: deepseekRes.status || 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Transform DeepSeek's SSE stream into a plain text stream of deltas.
  // Uses start() so we eagerly drain the upstream reader — pull() can stall
  // under backpressure and cause the stream to stop mid-response.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = deepseekRes.body!.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let buffer = ''

      const flushLines = (forceFlushBuffer: boolean) => {
        const parts = buffer.split('\n')
        buffer = forceFlushBuffer ? '' : parts.pop() || ''
        const lines = forceFlushBuffer ? parts.concat(buffer ? [buffer] : []) : parts
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta.length > 0) {
              controller.enqueue(encoder.encode(delta))
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          flushLines(false)
        }
        // Flush any trailing partial buffer in case the upstream didn't end
        // with a newline.
        buffer += decoder.decode()
        flushLines(true)
        controller.close()
      } catch (e) {
        controller.error(e)
      } finally {
        try { reader.releaseLock() } catch { /* already released */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
