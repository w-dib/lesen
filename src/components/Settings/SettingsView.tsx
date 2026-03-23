import { useState, useRef, useEffect } from 'react'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportAllData, importData, clearAllData } from '@/services/dataExport'

const CHAPTER_SIZE_KEY = 'lesen-chapter-size'
const FONT_SIZE_KEY = 'lesen-font-size'

export function getChapterSize(): number {
  return Number(localStorage.getItem(CHAPTER_SIZE_KEY)) || 3000
}

export function getReaderFontSize(): number {
  return Number(localStorage.getItem(FONT_SIZE_KEY)) || 18
}

export default function SettingsView() {
  const [chapterSize, setChapterSize] = useState(getChapterSize)
  const [fontSize, setFontSize] = useState(getReaderFontSize)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(CHAPTER_SIZE_KEY, String(chapterSize))
  }, [chapterSize])

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize))
  }, [fontSize])

  async function handleExport() {
    await exportAllData()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importData(file)
      setImportStatus(`Imported ${result.books} books and ${result.words} words`)
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    e.target.value = ''
  }

  async function handleClear() {
    await clearAllData()
    setShowClearConfirm(false)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-[calc(env(safe-area-inset-top,16px)+5px)]">
        <h1 className="mb-4 text-2xl font-bold text-brown">Settings</h1>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-8">
        {/* Chapter size */}
        <SettingsSection title="Default chapter size" description="Characters per chapter when auto-splitting imported text">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1000}
              max={10000}
              step={500}
              value={chapterSize}
              onChange={e => setChapterSize(Number(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="w-16 text-right text-sm font-medium text-brown">
              {chapterSize.toLocaleString()}
            </span>
          </div>
        </SettingsSection>

        {/* Font size */}
        <SettingsSection title="Reader font size" description="Text size in the reading view">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={14}
              max={28}
              step={1}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="w-12 text-right text-sm font-medium text-brown">
              {fontSize}px
            </span>
          </div>
        </SettingsSection>

        {/* Export */}
        <SettingsSection title="Export data" description="Download all books and vocabulary as a JSON backup">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </SettingsSection>

        {/* Import */}
        <SettingsSection title="Import data" description="Restore from a previously exported JSON backup. This replaces all current data.">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
          {importStatus && (
            <p className="mt-2 text-xs text-brown-muted">{importStatus}</p>
          )}
        </SettingsSection>

        {/* Clear data */}
        <SettingsSection title="Clear all data" description="Delete all books, chapters, and vocabulary. This cannot be undone.">
          {showClearConfirm ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Are you sure?</p>
                <p className="text-xs text-red-500">All data will be permanently deleted.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" onClick={handleClear}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Clear all data
            </Button>
          )}
        </SettingsSection>

        {/* About */}
        <div className="mt-4 border-t border-brown-muted/15 pt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Lesen" className="h-6 w-6" />
            <p className="font-serif text-lg font-semibold text-brown">Lesen</p>
          </div>
          <p className="mt-0.5 text-xs text-brown-muted">
            A mobile-first German reading &amp; vocabulary app
          </p>
          <p className="mt-0.5 text-xs text-brown-muted">v1.0.0</p>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-brown-muted/10 bg-white p-4">
      <h3 className="text-sm font-semibold text-brown">{title}</h3>
      <p className="mb-3 text-xs text-brown-muted">{description}</p>
      {children}
    </div>
  )
}
