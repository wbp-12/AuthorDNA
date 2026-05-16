import { Moon, SunMedium } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'

type FloatingThemeToggleProps = {
  className?: string
}

export function FloatingThemeToggle({ className }: FloatingThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className={className ?? 'fixed right-4 bottom-4 z-30'}>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="min-h-12 rounded-full border border-border/70 bg-card/90 px-4 text-sm font-medium text-ink shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-card"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDark}
        onClick={toggleTheme}
      >
        {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  )
}