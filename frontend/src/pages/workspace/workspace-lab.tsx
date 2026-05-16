import { FlaskConical } from 'lucide-react'

import { SectionCard } from './workspace-shared'

export default function WorkspaceLab() {
  return (
    <SectionCard title="Lab" description="Experiment with new wording and page structures here." icon={FlaskConical}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border/80 bg-card/80 p-5">
          <div className="text-sm font-medium text-foreground">Experiment queue</div>
          <p className="mt-2 text-sm leading-6 text-foreground/50">
            Keep new title, paragraph, and structure drafts here before deciding whether to promote them to the main work.
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/80 p-5">
          <div className="text-sm font-medium text-foreground">Calibration notes</div>
          <p className="mt-2 text-sm leading-6 text-foreground/50">
            Compare tone and rhythm across versions to find the best baseline for the current project.
          </p>
        </div>
      </div>
    </SectionCard>
  )
}