import { useState, useRef } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, Upload, ClipboardPaste, ImagePlus, Loader2 } from 'lucide-react'
import { importBook, readFileAsText, resizeImage } from '@/services/importer'
import { LANGUAGES, type Language } from '@/db/database'
import { getDefaultLanguage } from '@/components/Settings/SettingsView'
import { cn } from '@/lib/utils'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

interface PreChapter {
  title: string
  content: string
}

export default function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | undefined>()
  const [mode, setMode] = useState<'choose' | 'paste' | 'file'>('choose')
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [preChapters, setPreChapters] = useState<PreChapter[] | undefined>()
  const [language, setLanguage] = useState<Language>(getDefaultLanguage)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitle('')
    setText('')
    setCoverUrl(undefined)
    setMode('choose')
    setFileName('')
    setImporting(false)
    setParsing(false)
    setPreChapters(undefined)
    setLanguage(getDefaultLanguage())
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const name = file.name.replace(/\.[^.]+$/, '')
    const ext = file.name.split('.').pop()?.toLowerCase()
    setFileName(file.name)
    setError(null)
    setParsing(true)

    try {
      if (ext === 'epub') {
        const { parseEpub } = await import('@/services/epubParser')
        const result = await parseEpub(file)
        if (!title) setTitle(result.title)
        if (result.coverUrl && !coverUrl) setCoverUrl(result.coverUrl)
        setPreChapters(result.chapters)
        const fullText = result.chapters.map(c => c.content).join('\n\n')
        setText(fullText)
      } else if (ext === 'pdf') {
        const { parsePdf } = await import('@/services/pdfParser')
        const result = await parsePdf(file)
        if (!title) setTitle(name)
        setText(result.text)
      } else {
        // Plain text
        if (!title) setTitle(name)
        const content = await readFileAsText(file)
        setText(content)
      }
      setMode('file')
    } catch (err) {
      console.error('File parse error:', err)
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await resizeImage(file)
    setCoverUrl(dataUrl)
  }

  async function handleImport() {
    if (!title.trim() || !text.trim()) return
    setImporting(true)
    try {
      await importBook({
        title: title.trim(),
        text,
        coverUrl,
        language,
        preChapters,
      })
      handleClose()
      onImported()
    } catch (err) {
      console.error('Import failed:', err)
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setImporting(false)
    }
  }

  const canImport = title.trim().length > 0 && text.trim().length > 0 && !parsing

  return (
    <Sheet open={open} onClose={handleClose} title="Import Book">
      <div className="flex flex-col gap-5 p-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brown">Title</label>
          <Input
            placeholder="Enter book title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Language */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brown">Language</label>
          <div className="flex gap-1.5">
            {LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  language === code
                    ? 'bg-brown text-cream'
                    : 'bg-cream-dark text-brown-muted hover:text-brown'
                )}
              >
                {flag} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cover image */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brown">Cover image</label>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
          <button
            onClick={() => coverRef.current?.click()}
            className="flex items-center gap-3 rounded-lg border border-dashed border-brown-muted/30 p-3 transition-colors hover:bg-cream-dark"
          >
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="h-[90px] w-[60px] rounded object-cover" />
            ) : (
              <div className="flex h-[90px] w-[60px] items-center justify-center rounded bg-cream-dark">
                <ImagePlus className="h-6 w-6 text-brown-muted" />
              </div>
            )}
            <span className="text-sm text-brown-muted">
              {coverUrl ? 'Tap to change cover' : 'Add cover image (optional)'}
            </span>
          </button>
        </div>

        {/* Content source */}
        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <label className="mb-0.5 block text-sm font-medium text-brown">Content</label>
            <button
              onClick={() => setMode('paste')}
              className="flex items-center gap-3 rounded-xl border border-brown-muted/20 p-4 text-left transition-colors hover:bg-cream-dark"
            >
              <div className="rounded-lg bg-amber/20 p-2.5">
                <ClipboardPaste className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="font-medium text-brown">Paste Text</p>
                <p className="text-xs text-brown-muted">Paste raw text directly</p>
              </div>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="flex items-center gap-3 rounded-xl border border-brown-muted/20 p-4 text-left transition-colors hover:bg-cream-dark"
            >
              <div className="rounded-lg bg-amber/20 p-2.5">
                {parsing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gold" />
                ) : (
                  <Upload className="h-5 w-5 text-gold" />
                )}
              </div>
              <div>
                <p className="font-medium text-brown">
                  {parsing ? 'Parsing file...' : 'Upload File'}
                </p>
                <p className="text-xs text-brown-muted">.txt, .epub, .pdf</p>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.epub,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Paste mode */}
        {mode === 'paste' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brown">Paste your text</label>
            <textarea
              className="min-h-[200px] w-full rounded-lg border border-brown-muted/30 bg-white p-3 text-sm text-brown placeholder:text-brown-muted/60 focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Paste German text here..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button
              onClick={() => { setMode('choose'); setText(''); setPreChapters(undefined) }}
              className="mt-1 text-xs text-brown-muted hover:text-brown"
            >
              Back to options
            </button>
          </div>
        )}

        {/* File loaded */}
        {mode === 'file' && (
          <div className="rounded-lg border border-brown-muted/20 bg-cream-dark/50 p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brown-muted" />
              <span className="text-sm font-medium text-brown">{fileName}</span>
            </div>
            <p className="mt-1 text-xs text-brown-muted">
              {text.length.toLocaleString()} characters
              {preChapters && ` · ${preChapters.length} chapters`}
            </p>
            <button
              onClick={() => { setMode('choose'); setText(''); setFileName(''); setPreChapters(undefined) }}
              className="mt-1 text-xs text-brown-muted hover:text-brown"
            >
              Choose different source
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Import button */}
        <Button
          onClick={handleImport}
          disabled={!canImport || importing}
          className="w-full"
          size="lg"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            'Import Book'
          )}
        </Button>
      </div>
    </Sheet>
  )
}
