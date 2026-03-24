import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] animate-in slide-in-from-bottom rounded-xl border border-brown-muted/15 bg-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-brown">Update available</p>
          <p className="text-xs text-brown-muted">A new version of Lesen is ready</p>
        </div>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          <RefreshCw className="h-3.5 w-3.5" />
          Update
        </Button>
      </div>
    </div>
  )
}
