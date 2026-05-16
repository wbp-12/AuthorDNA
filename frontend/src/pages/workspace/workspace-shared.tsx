import { type ReactNode } from 'react'
import { BookOpenText, FlaskConical, LayoutGrid, Settings2, Sparkles, type LucideIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const workspaceSections = [
  { value: 'home', label: 'Home', icon: LayoutGrid },
  { value: 'writing-dna', label: 'Writing DNA', icon: Sparkles },
  { value: 'works', label: 'Works', icon: BookOpenText },
  { value: 'lab', label: 'Lab', icon: FlaskConical },
  { value: 'settings', label: 'Settings', icon: Settings2 },
] as const

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <Card className="border-border bg-card/82 py-0 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <CardHeader className="gap-3 border-b border-border/70 px-7 py-7 sm:px-8">
        <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
          <CardDescription className="text-sm leading-6 text-foreground/50">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-7 py-7 sm:px-8">{children}</CardContent>
    </Card>
  )
}