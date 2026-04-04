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
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-56 flex-col border-r border-brown-muted/15 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <img src="/logo.png" alt="Lesen" className="h-8 w-8" />
          <span className="font-serif text-xl font-bold text-brown">Lesen</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {tabs.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-cream-dark text-brown'
                    : 'text-brown-muted hover:bg-cream-dark/50 hover:text-brown'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-gold')} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile bottom tabs — hidden on desktop */}
      <nav className="sticky bottom-0 z-50 flex border-t border-brown-muted/15 bg-cream/95 backdrop-blur-sm lg:hidden">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 pb-[calc(env(safe-area-inset-bottom,8px)+4px)] pt-2 text-xs transition-colors',
                active ? 'text-brown font-medium' : 'text-brown-muted'
              )}
            >
              <Icon className={cn('h-6 w-6', active && 'text-gold')} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
