import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { PreviewInspectorBridge } from '@/components/PreviewInspectorBridge'
import { ThemeProvider, initializeTheme } from '@/components/ThemeProvider'

import { MockSystemProvider } from '@/components/MockSystemProvider'
import { router } from '@/router'

import './index.css'

function ensureFontStylesheet() {
  const href = `${import.meta.env.BASE_URL}fonts/inter.css`

  if (document.querySelector(`link[data-author-dna-fonts="inter"]`)) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.authorDnaFonts = 'inter'
  document.head.append(link)
}

initializeTheme()
ensureFontStylesheet()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <MockSystemProvider>
        <PreviewInspectorBridge />
        <RouterProvider router={router} />
      </MockSystemProvider>
    </ThemeProvider>
  </StrictMode>,
)
