export interface Token {
  word: string
  pre: string   // punctuation/whitespace before
  post: string  // punctuation attached after (.,!? etc.)
}

const WORD_RE = /[\p{L}\p{M}'-]+/gu
const SENTENCE_END = /[.!?]/

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let lastIndex = 0

  for (const match of text.matchAll(WORD_RE)) {
    const start = match.index!
    const word = match[0]
    const pre = text.slice(lastIndex, start)

    // Grab trailing punctuation attached to the word
    let postEnd = start + word.length
    while (postEnd < text.length && /[.,;:!?»«"'")\]—–-]/.test(text[postEnd])) {
      postEnd++
    }
    const post = text.slice(start + word.length, postEnd)

    tokens.push({ word, pre, post })
    lastIndex = postEnd
  }

  return tokens
}

export function extractUniqueWords(text: string): string[] {
  const words = new Set<string>()
  for (const match of text.matchAll(WORD_RE)) {
    words.add(match[0].toLowerCase())
  }
  return [...words]
}

export function countWords(text: string): number {
  const matches = text.match(WORD_RE)
  return matches ? matches.length : 0
}

export function isNumber(word: string): boolean {
  return /^\d[\d:.,]*$/.test(word)
}

export function findSentenceBounds(text: string, wordIndex: number): { start: number; end: number } {
  const tokens = tokenize(text)
  let sentenceStart = 0
  let sentenceEnd = tokens.length - 1

  // Walk back from wordIndex to find sentence start
  for (let i = wordIndex - 1; i >= 0; i--) {
    if (SENTENCE_END.test(tokens[i].post)) {
      sentenceStart = i + 1
      break
    }
  }

  // Walk forward from wordIndex to find sentence end
  for (let i = wordIndex; i < tokens.length; i++) {
    if (SENTENCE_END.test(tokens[i].post)) {
      sentenceEnd = i
      break
    }
  }

  return { start: sentenceStart, end: sentenceEnd }
}
