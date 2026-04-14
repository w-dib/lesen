import type { Language } from '@/db/database'

const LANG_NAMES: Record<Language, string> = {
  de: 'German',
  af: 'Afrikaans',
  ru: 'Russian',
  ar: 'Arabic',
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  lemma?: string
  translation?: string
  sentence?: string
  translationSentence?: string
  exerciseType?: string
  language?: Language
}

/**
 * Stream a chat response from the backend. Calls `onDelta` with each text chunk
 * as it arrives, and returns the final full string when done.
 */
export async function streamChat(
  messages: ChatMessage[],
  context: ChatContext,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      context: {
        ...context,
        language: context.language ? LANG_NAMES[context.language] : 'German',
      },
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error('Chat request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    onDelta(chunk)
  }
  return full
}
