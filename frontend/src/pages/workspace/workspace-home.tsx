import { useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutGrid, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
// no hooks needed here; summaries come from workspace-writing-dna
import { dnaDimensions } from './workspace-writing-dna'

import { SectionCard } from './workspace-shared'

export default function WorkspaceHome() {
  const navigate = useNavigate()

  return (
    <div className="grid gap-6">
      <div className="mt-5 rounded-2xl border border-border/80 bg-card/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ArrowRight className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold text-foreground">Quick start with upload</h2>
            <p className="text-sm leading-6 text-foreground/50">
              Upload a new file first, then refine Writing DNA, organize Works, and test ideas in Lab.
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/upload')} className="rounded-xl px-4">
            Go to Upload
          </Button>
        </div>
      </div>
      <SectionCard
        title="Overview"
        description="Start here to review today’s writing focus, project progress, and next actions."
        icon={LayoutGrid}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Writing focus', value: '3 chapters' },
            { label: 'Drafts', value: '8 entries' },
            { label: 'Experiments', value: '2 active' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/80 bg-card/80 p-4">
              <div className="text-sm text-foreground/50">{item.label}</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>


      </SectionCard>

      <SectionCard title="Writing DNA Glance" description="A quick five-dimension summary of your baseline profile." icon={Sparkles}>
        <div className="grid gap-3 sm:grid-cols-2">
          {dnaDimensions.map((d) => (
            <div key={d.name} className="rounded-2xl border border-border/80 bg-card/80 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{d.name}</div>
                <div className="text-sm text-foreground/90">{d.summary}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// Writing DNA summaries now reused from workspace-writing-dna.tsx (dnaDimensions)