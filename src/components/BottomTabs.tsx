import { BookOpen, Languages, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: 'Library', icon: BookOpen },
  { path: '/vocabulary', label: 'Vocabulary', icon: Languages },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const

export default function BottomTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  const isTabRoute = tabs.some(t => t.path === location.pathname)
  if (!isTabRoute) return null

  return (
    <nav className="sticky bottom-0 z-50 flex border-t border-brown-muted/15 bg-cream/95 backdrop-blur-sm">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 pb-[env(safe-area-inset-bottom,8px)] pt-2 text-xs transition-colors',
              active ? 'text-brown font-medium' : 'text-brown-muted'
            )}
          >
            <Icon className={cn('h-6 w-6', active && 'text-gold')} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
