import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'

import AuthorDnaNegotiation from '@/pages/AuthorDnaNegotiation'

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

const routes = [
  {
    path: '/',
    element: <AuthorDnaNegotiation />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '*',
    element: <RouteErrorPage />,
  },
]

export const router = createBrowserRouter(routes)
