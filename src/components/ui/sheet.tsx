import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  title?: string
}

export function Sheet({ open, onClose, children, className, title }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-cream shadow-xl animate-slide-up',
          className
        )}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brown-muted/15 bg-cream px-5 py-4">
            <h2 className="text-lg font-semibold text-brown">{title}</h2>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-cream-dark">
              <X className="h-5 w-5 text-brown-muted" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
