import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'

import AppHeader from '@/components/AppHeader'
import { useAdminSession } from '@/stores/use-admin-session'
import { cn } from '@/lib/utils'

import { workspaceSections } from './workspace/workspace-shared'

function getActiveSection(pathname: string) {
  const matched = workspaceSections.find((section) => pathname.startsWith(`/workspace/${section.value}`))
  return matched?.value ?? 'home'
}

function WorkspaceSidebarNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeSection = getActiveSection(location.pathname)

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
      {workspaceSections.map((section) => {
        const Icon = section.icon as LucideIcon
        const isActive = activeSection === section.value

        return (
          <button
            key={section.value}
            type="button"
            onClick={() => navigate(`/workspace/${section.value}`)}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-2 text-left transition lg:w-full lg:px-4 lg:py-3',
              isActive
                ? 'border-primary/20 bg-primary text-primary-foreground shadow-sm'
                : 'border-border/80 bg-card text-foreground/60 hover:bg-card/90 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{section.label}</div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

function WorkspaceLayout() {
  return (
    <main className="min-h-screen overflow-hidden pt-16" style={{ background: 'var(--app-bg-gradient)' }}>
      <div className="absolute inset-x-0 top-0 h-72 opacity-70" style={{ background: 'var(--app-top-gradient)' }} />
      <AppHeader title="AuthorDNA Workspace" />
      <section className="relative min-h-[calc(100vh-4rem)] w-full px-4 pb-8 pt-28 sm:px-8 sm:pt-28 lg:pl-[22rem] lg:pr-14 lg:pt-8">
        <aside className="fixed left-0 right-0 top-16 z-40 lg:left-6 lg:right-auto lg:top-[5rem] lg:h-[calc(100vh-5.5rem)] lg:w-[17rem]">
          <div className="flex max-h-[calc(100vh-4rem)] flex-col gap-3 overflow-y-auto border border-x-0 border-t-0 border-border/70 bg-card/88 px-4 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:h-full lg:max-h-none lg:gap-4 lg:overflow-y-auto lg:rounded-[2rem] lg:border lg:bg-card/80 lg:p-4">
            <div className="hidden space-y-2 px-2 pt-1 lg:block">
              <div className="text-sm font-medium text-foreground">Workspace</div>
            </div>
            <WorkspaceSidebarNav />
            <div className="mt-auto hidden rounded-2xl border border-border/80 bg-background/70 p-4 lg:block">
              <div className="text-sm font-medium text-foreground">Quick status</div>
              <div className="mt-1 text-sm leading-6 text-foreground/50">Your session is active and the workspace is ready.</div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:w-full lg:max-w-none">
          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default function WorkspaceShell() {
  const isAuthenticated = useAdminSession((state) => state.isAuthenticated)
  const session = useAdminSession((state) => state.session)

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />
  }

  return <WorkspaceLayout />
}