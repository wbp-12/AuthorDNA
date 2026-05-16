import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import AnalysisPage from '@/pages/AnalysisPage'
import FileUploadPage from '@/pages/FileUploadPage'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import WorkspaceShell from '@/pages/Workspace'
import WorkspaceHome from '@/pages/workspace/workspace-home'
import WorkspaceLab from '@/pages/workspace/workspace-lab'
import WorkspaceSettings from '@/pages/workspace/workspace-settings'
import WorkspaceWorks from '@/pages/workspace/workspace-works'
import WorkspaceWritingDna from '@/pages/workspace/workspace-writing-dna'
import { useAdminSession } from '@/stores/use-admin-session'
import { useFileStore } from '@/stores/use-file-store'

function ProtectedRoute() {
  const hasFiles = useFileStore((s) => s.files.length > 0)
  if (!hasFiles) return <Navigate to="/upload" replace />
  return <Outlet />
}

function RouteErrorPage() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error) && error.status === 404 ? '404 Not Found' : 'Something went wrong'
  const message =
    isRouteErrorResponse(error) && error.status === 404
      ? 'The page you requested does not exist.'
      : 'The route failed to render. Try going back to the home screen.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="max-w-xl rounded-3xl border border-border bg-paper p-8 shadow-soft">
        <p className="font-serif text-sm uppercase tracking-[0.28em] text-brand">AuthorDNA</p>
        <h1 className="mt-4 text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">{message}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}


function ProtectedWorkspaceRoute() {
  const isAuthenticated = useAdminSession((state) => state.isAuthenticated)
  const session = useAdminSession((state) => state.session)

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />
  }

  return <WorkspaceShell />
}

const routes = [
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/upload',
    element: <FileUploadPage />,
  },
  {
    path: '/analysis',
    element: <ProtectedRoute />,
    children: [{ index: true, element: <AnalysisPage /> }],
  },
  {
    path: '/workspace',
    element: <ProtectedWorkspaceRoute />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <WorkspaceHome /> },
      { path: 'writing-dna', element: <WorkspaceWritingDna /> },
      { path: 'works', element: <WorkspaceWorks /> },
      { path: 'lab', element: <WorkspaceLab /> },
      { path: 'settings', element: <WorkspaceSettings /> },
      { path: '*', element: <Navigate to="home" replace /> },
    ],
  },
  {
    path: '/dashboard',
    element: <Navigate to="/workspace/home" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '*',
    element: <RouteErrorPage />,
  },
]

export const router = createBrowserRouter(routes)
