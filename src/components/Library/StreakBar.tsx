import { useState, useEffect } from 'react'
import { getStreak, getWeekActivity } from '@/services/streak'
import { cn } from '@/lib/utils'
import { Check, Flame } from 'lucide-react'

export default function StreakBar() {
  const [streak, setStreak] = useState(0)
  const [week, setWeek] = useState<{ day: string; active: boolean; isToday: boolean }[]>([])

  useEffect(() => {
    setStreak(getStreak())
    setWeek(getWeekActivity())
  }, [])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brown-muted/10 bg-white px-4 py-3">
      {/* Streak count */}
      <div className="flex items-center gap-1.5">
        <Flame className={cn('h-5 w-5', streak > 0 ? 'text-orange-500' : 'text-brown-muted/40')} />
        <span className={cn('text-sm font-bold', streak > 0 ? 'text-brown' : 'text-brown-muted')}>
          {streak}
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-brown-muted/15" />

      {/* Week dots */}
      <div className="flex flex-1 justify-between">
        {week.map(({ day, active, isToday }) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <span className={cn('text-[10px]', isToday ? 'font-bold text-brown' : 'text-brown-muted')}>
              {day}
            </span>
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                active
                  ? 'bg-gold text-white'
                  : isToday
                  ? 'border-2 border-gold/40 bg-cream-dark'
                  : 'bg-cream-dark',
              )}
            >
              {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
