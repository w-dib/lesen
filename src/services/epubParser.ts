import ePub from 'epubjs'

interface EpubResult {
  title: string
  chapters: { title: string; content: string }[]
  coverUrl?: string
}

export async function parseEpub(file: File): Promise<EpubResult> {
  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer)
  await book.ready

  // Get title
  const title = book.packaging?.metadata?.title || file.name.replace(/\.epub$/i, '')

  // Extract cover
  let coverUrl: string | undefined
  try {
    const coverUrlRaw = await book.coverUrl()
    if (coverUrlRaw) {
      // Convert blob URL to data URL for storage
      const res = await fetch(coverUrlRaw)
      const blob = await res.blob()
      coverUrl = await blobToDataUrl(blob)
    }
  } catch {
    // No cover available
  }

  // Extract chapters
  const spine = book.spine as unknown as { each: (fn: (item: { load: (book: unknown) => Promise<{ document: Document }>; href: string }) => void) => void }
  const chapters: { title: string; content: string }[] = []

  const spineItems: { load: (book: unknown) => Promise<{ document: Document }>; href: string }[] = []
  spine.each((item) => spineItems.push(item))

  // Get TOC for chapter names
  const toc = await book.loaded.navigation
  const tocMap = new Map<string, string>()
  if (toc?.toc) {
    for (const entry of toc.toc) {
      tocMap.set(entry.href, entry.label?.trim() || '')
      if (entry.subitems) {
        for (const sub of entry.subitems) {
          tocMap.set(sub.href, sub.label?.trim() || '')
        }
      }
    }
  }

  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i]
    try {
      const contents = await item.load(book.load.bind(book))
      const doc = contents.document
      const text = extractTextFromDoc(doc)
      if (text.trim().length > 50) {
        const chapterTitle = tocMap.get(item.href) || `Chapter ${chapters.length + 1}`
        chapters.push({ title: chapterTitle, content: text.trim() })
      }
    } catch {
      // Skip chapters that fail to load
    }
  }

  book.destroy()

  return { title, chapters, coverUrl }
}

function extractTextFromDoc(doc: Document): string {
  const body = doc.body || doc.documentElement
  if (!body) return ''

  // Walk through the DOM and build text with paragraph breaks
  const blocks: string[] = []
  const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'])

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) blocks.push(text)
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName === 'BR') {
        blocks.push('\n')
        return
      }
      const isBlock = blockTags.has(el.tagName)
      if (isBlock && blocks.length > 0) blocks.push('\n\n')
      for (const child of el.childNodes) walk(child)
      if (isBlock) blocks.push('\n\n')
    }
  }

  walk(body)

  return blocks.join(' ')
    .replace(/ +/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
