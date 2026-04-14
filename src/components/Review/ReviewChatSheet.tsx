import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { streamChat, type ChatMessage, type ChatContext } from '@/services/chat'
import { cn } from '@/lib/utils'

/** Minimal inline markdown renderer for chat messages. Handles **bold**,
 * *italic*, and `code`. Safe with streaming partial text — incomplete markers
 * are simply rendered as-is until the closing marker arrives. */
function renderMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /(\*\*[^*\n]+?\*\*)|(\*[^*\n]+?\*)|(`[^`\n]+?`)/g
  let lastIdx = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index))
    }
    const full = match[0]
    if (full.startsWith('**')) {
      nodes.push(<strong key={key++}>{full.slice(2, -2)}</strong>)
    } else if (full.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded bg-cream-dark px-1 py-0.5 font-mono text-[0.9em]">
          {full.slice(1, -1)}
        </code>,
      )
    } else {
      nodes.push(<em key={key++}>{full.slice(1, -1)}</em>)
    }
    lastIdx = match.index + full.length
  }
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx))
  }
  return nodes
}

interface ReviewChatSheetProps {
  open: boolean
  onClose: () => void
  context: ChatContext
}

export default function ReviewChatSheet({ open, onClose, context }: ReviewChatSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Reset chat when the question (context) changes or the sheet closes
  useEffect(() => {
    if (!open) {
      setMessages([])
      setInput('')
      setError(null)
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [open])

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [context.lemma, context.sentence])

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || streaming) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const history = [...messages, userMessage]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat(
        history,
        context,
        delta => {
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + delta }
            }
            return next
          })
        },
        controller.signal,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // cancelled — leave partial response in place
      } else {
        setError('Failed to reach the AI. Try again.')
        setMessages(prev => prev.slice(0, -1))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, context, streaming])

  const suggestionChips = context.lemma
    ? [
        `What does "${context.lemma}" mean?`,
        context.sentence ? 'Break down this sentence' : null,
        `Give me another example with "${context.lemma}"`,
      ].filter(Boolean) as string[]
    : []

  return (
    <Sheet open={open} onClose={onClose} className="max-h-[75vh]">
      <div className="flex h-[75vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brown-muted/15 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <div>
              <h2 className="text-base font-semibold text-brown">Ask about this question</h2>
              {context.lemma && (
                <p className="text-xs text-brown-muted">
                  <span className="font-medium">{context.lemma}</span>
                  {context.translation && <span> · {context.translation}</span>}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-brown-muted hover:bg-cream-dark hover:text-brown">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Sparkles className="h-10 w-10 text-brown-muted/40" />
              <div>
                <p className="text-sm font-medium text-brown">Ask me anything</p>
                <p className="mt-0.5 text-xs text-brown-muted">
                  Grammar, usage, pronunciation, examples…
                </p>
              </div>
              {suggestionChips.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {suggestionChips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setInput(chip)}
                      className="rounded-full border border-brown-muted/20 bg-white px-3 py-1.5 text-xs text-brown-muted hover:bg-cream-dark hover:text-brown"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'self-end bg-brown text-cream'
                      : 'self-start bg-white text-brown border border-brown-muted/15',
                  )}
                >
                  {m.content
                    ? (m.role === 'assistant' ? renderMarkdown(m.content) : m.content)
                    : (
                      <span className="inline-flex items-center gap-1.5 text-brown-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Thinking…
                      </span>
                    )}
                </div>
              ))}
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-brown-muted/15 bg-cream px-3 py-3 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about this word, grammar, usage…"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-brown-muted/20 bg-white px-3 py-2.5 text-sm text-brown placeholder:text-brown-muted/60 focus:outline-none focus:ring-2 focus:ring-gold"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all',
                !input.trim() || streaming
                  ? 'bg-cream-dark text-brown-muted'
                  : 'bg-brown text-cream active:scale-95',
              )}
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
