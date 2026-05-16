import { ArrowRight, BookOpenText, Compass, Layers3, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminSession } from '@/stores/use-admin-session'

import AppHeader from '@/components/AppHeader'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Compass,
    title: 'A clear writing direction',
    description: 'Shape ideas, structure, and voice into a consistent writing flow.',
  },
  {
    icon: BookOpenText,
    title: 'A focused workspace',
    description: 'Keep Home, Writing DNA, Works, Lab, and Settings in one stable place.',
  },
  {
    icon: Layers3,
    title: 'A progressive trial flow',
    description: 'Start with overview, explore the interface, then register or sign in when ready.',
  },
] as const

const previewPanels = [
  {
    title: 'Workspace home',
    description: 'A calm entry point for daily writing progress and next actions.',
  },
  {
    title: 'Writing DNA',
    description: 'A place to define tone, cadence, and the shape of your content.',
  },
  {
    title: 'Works + Lab',
    description: 'Organize drafts in Works and test new ideas in Lab before shipping.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAdminSession()

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: 'var(--app-bg-gradient)' }}>
      <div className="absolute inset-x-0 top-0 h-72 opacity-70" style={{ background: 'var(--app-top-gradient)' }} />
      <AppHeader title="AuthorDNA" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-60 px-6 py-16 text-center sm:px-8 lg:px-12 lg:py-24">
        <section className="max-w-4xl space-y-8 py-16">
          <div className="inline-flex items-center gap-3 self-center text-sm text-foreground/50">
            <Sparkles className="size-4 text-foreground" />
            AuthorDNA for focused writing workflows
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              A workspace for writing, works, and experimentation.
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-foreground/50 sm:text-lg">
              AuthorDNA gives you a public landing page, a protected workspace, and a calm structure for daily writing. The public experience helps you understand the flow before you commit.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Button type="button" onClick={() => navigate('/workspace/home')}>
                Go to workspace
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => navigate('/register')}>
                  Create an account
                  <ArrowRight className="size-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="w-full space-y-8">
          <div className="space-y-4 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Overview
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-foreground/50">
              The app starts with a simple promise: keep the writing experience clear, lightweight, and easy to return to.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="space-y-4 border-t border-border/70 pt-6 text-center">
                  <div className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-background">
                    <Icon className="size-5 text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm leading-6 text-foreground/50">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="w-full space-y-8">
          <div className="space-y-4 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Feature preview
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-foreground/50">
              A quick visual preview of the workspace areas you can use after sign-in.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-3">
            {previewPanels.map((panel) => (
              <div key={panel.title} className="space-y-4 border-t border-border/70 pt-6 text-center">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,245,230,0.9),rgba(15,23,42,0.04))]">
                  <div className="flex h-full items-end justify-center p-5">
                    <div className="max-w-[75%] rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-left backdrop-blur">
                      <div className="text-sm font-medium text-foreground">{panel.title}</div>
                      <div className="mt-1 text-sm leading-6 text-foreground/50">{panel.description}</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-foreground/50">
                  Placeholder image area for future product screenshots or illustrations.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full space-y-8">
          <div className="space-y-4 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Pricing
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-foreground/50">
              Registration is free. To use the product, you bring your own API key and connect it in your workspace settings.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 border-t border-border/70 pt-6 text-center">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-foreground">Free registration</h3>
                  <p className="mt-1 text-sm leading-6 text-foreground/50">Create an account at no cost.</p>
                </div>
                <div className="text-2xl font-semibold text-foreground">$0</div>
              </div>

              <div className="space-y-3 border-t border-border/70 pt-4">
                <div className="flex items-start justify-between gap-4 text-left">
                  <div>
                    <div className="text-sm font-medium text-foreground">Bring your own API key</div>
                    <div className="mt-1 text-sm leading-6 text-foreground/50">Use your preferred provider and manage the key yourself.</div>
                  </div>
                  <div className="text-sm text-foreground/50">Required</div>
                </div>
                <div className="flex items-start justify-between gap-4 text-left">
                  <div>
                    <div className="text-sm font-medium text-foreground">Workspace access</div>
                    <div className="mt-1 text-sm leading-6 text-foreground/50">Home, Writing DNA, Works, Lab, and Settings are included after sign-in.</div>
                  </div>
                  <div className="text-sm text-foreground/50">Included</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border/70 pt-6 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Start when ready</h3>
                <p className="mx-auto max-w-md text-sm leading-6 text-foreground/50">
                  There is no upfront subscription barrier. Register for free, then add your API key to begin using the app.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <Button type="button" onClick={() => navigate('/workspace/home')}>
                    Go to workspace
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <>
                    <Button type="button" onClick={() => navigate('/register')}>
                      Register free
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                      Sign in
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}