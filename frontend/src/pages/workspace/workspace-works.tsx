import { FileText } from 'lucide-react'

import { SectionCard } from './workspace-shared'

export default function WorkspaceWorks() {
  return (
    <SectionCard title="Works" description="Manage works, drafts, published content, and pending materials." icon={FileText}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Current draft: reworking chapters', 'Published work: 3 pieces to revisit', 'Archive: 12 historical materials'].map((label) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-card p-4">
            <div className="text-sm text-foreground/50">Work status</div>
            <div className="mt-2 text-base font-medium text-foreground">{label}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}