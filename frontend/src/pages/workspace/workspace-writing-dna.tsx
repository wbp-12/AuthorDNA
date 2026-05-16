import { useState } from 'react'
import { Sparkles, ChevronDown, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

import { SectionCard } from './workspace-shared'

export const dnaDimensions = [
  {
    name: 'Sentence Flow',
    summary: 'Compact, direct cadence',
    comparableWriter: 'Joan Didion',
    detail:
      'This dimension measures how smoothly one sentence hands off to the next. Strong sentence flow avoids unnecessary turns, keeps clause structure clear, and uses punctuation to control pace rather than decorate the page. In practice, this is the dimension that makes a paragraph feel effortless even when the underlying argument is complex.',
  },
  {
    name: 'Tone',
    summary: 'Controlled, measured confidence',
    comparableWriter: 'James Baldwin',
    detail:
      'Tone captures the emotional temperature of the page. It answers whether the text sounds reassuring, analytical, urgent, intimate, or detached. A strong tone stays consistent without becoming flat; it can soften hard claims, sharpen key points, or make a personal observation feel trustworthy. When tone is aligned, readers feel the author is speaking with intention, not just producing sentences.',
  },
  {
    name: 'Word Choice',
    summary: 'Precise, restrained vocabulary',
    comparableWriter: 'Maya Angelou',
    detail:
      'Word choice is the vocabulary layer of your voice. It reveals whether you prefer concrete nouns, abstract concepts, vivid verbs, or formal terminology. The best word choice is not the fanciest one; it is the one that matches the audience and the purpose of the sentence. This dimension should reflect whether your language feels exact, approachable, and emotionally consistent with the rest of the piece.',
  },
  {
    name: 'Structure',
    summary: 'Clear progression, early orientation',
    comparableWriter: 'George Orwell',
    detail:
      'Structure describes how your ideas are arranged across paragraphs and sections. It shows whether you lead with the point, build toward it, or circle around it before landing. A strong structure makes the path through the argument visible, so readers can predict the direction without losing interest. It is also the dimension that controls how quickly a page moves from context to insight.',
  },
  {
    name: 'Punctuation',
    summary: 'Intentional pacing and emphasis',
    comparableWriter: 'Virginia Woolf',
    detail:
      'Punctuation is the timing system of the page. Commas slow the reader down, dashes widen a thought, semicolons connect balanced ideas, and periods create authority through closure. When punctuation is consistent with your voice, the text feels confident and readable. This dimension also reveals whether you prefer smooth continuity, controlled interruption, or a more formal ending rhythm.',
  },
] as const

export default function WorkspaceWritingDna() {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()

  const toggle = (name: string) => setOpen((s) => ({ ...s, [name]: !s[name] }))

  return (
    <>
      <SectionCard
        title="Writing DNA"
        description="Read your writing through the same five dimensions used in Calibration, with a compact summary and a deeper profile for each one."
        icon={Sparkles}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {dnaDimensions.map((dimension) => (
            <article key={dimension.name} className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/50">
                    {dimension.name}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{dimension.summary}</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground/55">Comparable writer: {dimension.comparableWriter}</p>
                </div>
                <button
                  aria-expanded={!!open[dimension.name]}
                  onClick={() => toggle(dimension.name)}
                  className="ml-4 mt-1 rounded-md p-2 hover:bg-highlight/8"
                >
                  <ChevronDown className={`transition-transform ${open[dimension.name] ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {open[dimension.name] && (
                <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground/45">Detailed analysis</div>
                  <p className="mt-2 text-sm leading-6 text-foreground/70">{dimension.detail}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </SectionCard>
      <div className="mt-5 rounded-2xl border border-border/80 bg-card/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ArrowRight className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold text-foreground">Quick questionnaire (coming soon)</h2>
            <p className="text-sm leading-6 text-foreground/50">
              A short guided survey to help refine your Writing DNA. This feature is not implemented yet.
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/workspace/writing-dna#questionnaire')} className="rounded-xl px-4">
            Open questionnaire
          </Button>
        </div>
      </div>
      <SectionCard
        title="Reference articles"
        description="Upload and manage reference articles that inform your baseline profile."
        icon={Sparkles}
      >
        <div className="space-y-3">
          <div className="text-sm text-foreground/60">Store PDFs, notes, or exemplar articles that reflect your preferred voice and structure.</div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => navigate('/workspace/works')}>Manage references</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/upload')}>Upload new</Button>
          </div>
        </div>
      </SectionCard>


    </>
  )
}