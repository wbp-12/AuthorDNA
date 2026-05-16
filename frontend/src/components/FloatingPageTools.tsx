import { BellRing, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { MockResultOption, PageEventDefinition } from '@/lib/mock-types'
import { useAppStore } from '@/stores/use-app-store'

interface FloatingPageToolsProps<TEventOption extends MockResultOption = MockResultOption> {
  events: PageEventDefinition<TEventOption>[]
  onEventSelect: (event: PageEventDefinition<TEventOption>) => void
}

export function FloatingPageTools<TEventOption extends MockResultOption = MockResultOption>({
  events,
  onEventSelect,
}: FloatingPageToolsProps<TEventOption>) {
  const activeToolPanel = useAppStore((state) => state.activeToolPanel)
  const setActiveToolPanel = useAppStore((state) => state.setActiveToolPanel)
  const toggleToolPanel = useAppStore((state) => state.toggleToolPanel)

  const isPanelOpen = activeToolPanel !== null

  return (
    <>
      <div className="fixed left-3 top-1/2 z-20 grid -translate-y-1/2 gap-3 max-sm:bottom-4 max-sm:left-3 max-sm:top-auto max-sm:translate-y-0">
        <Button
          type="button"
          size="lg"
          className="min-h-14 min-w-14 rounded-full px-4 shadow-md"
          aria-expanded={isPanelOpen}
          onClick={() => toggleToolPanel('events')}
        >
          <BellRing className="size-4" />
          事件
        </Button>
      </div>

      {isPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="关闭事件面板"
            className="fixed inset-0 z-[18] cursor-default bg-transparent"
            onClick={() => setActiveToolPanel(null)}
          />
          <Card className="fixed left-[4.75rem] top-1/2 z-[19] w-[min(380px,calc(100vw-6rem))] -translate-y-1/2 border border-border bg-card/95 shadow-xl backdrop-blur max-sm:bottom-[5.75rem] max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:w-auto max-sm:translate-y-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 pb-3">
              <div className="space-y-1">
                <CardDescription>页面事件</CardDescription>
                <CardTitle>非按钮交互模拟</CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭工具面板"
                onClick={() => setActiveToolPanel(null)}
              >
                <X className="size-4" />
              </Button>
            </CardHeader>

            <CardContent className="grid gap-3 p-5 pt-0">
              {events.map((event) => (
                <Button
                  key={event.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal"
                  onClick={() => {
                    setActiveToolPanel(null)
                    onEventSelect(event)
                  }}
                >
                  <span className="block font-bold text-[var(--text-strong)]">{event.label}</span>
                  <span className="block text-sm text-[var(--muted)]">{event.description}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  )
}
