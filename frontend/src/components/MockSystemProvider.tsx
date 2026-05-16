import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { FeedbackModal } from '@/components/FeedbackModal'
import { MockInteractionModal } from '@/components/MockInteractionModal'
import { sendAgentFeedback } from '@/lib/agent-feedback-client'
import type { AgentFeedbackInput } from '@/lib/agent-feedback-client'
import { MockSystemContext } from '@/lib/mock-system-context'
import type {
  FeedbackDialogRequest,
  MockDialogRequest,
  MockResultOption,
  NoticeState,
  NoticeTone,
} from '@/lib/mock-types'
import { cn } from '@/lib/utils'

type AnyMockDialogRequest = MockDialogRequest<MockResultOption<any, any>>

function resolveTargetName(componentName?: string, eventName?: string) {
  return eventName ?? componentName ?? '未命名交互'
}

function buildFeedbackPayload(
  request: FeedbackDialogRequest,
  feedbackText: string,
): AgentFeedbackInput {
  return {
    pageName: request.pageName,
    route: request.route,
    componentOrEventName: resolveTargetName(request.componentName, request.eventName),
    interactionName: request.interactionName,
    selectedMockResult: request.selectedMockResult ?? '用户主动反馈',
    feedbackText,
    prioritySuggestion: request.prioritySuggestion,
  }
}

export function MockSystemProvider({ children }: { children: ReactNode }) {
  const [mockRequest, setMockRequest] = useState<AnyMockDialogRequest | null>(null)
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackDialogRequest | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [notice, setNotice] = useState<NoticeState | null>(null)

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    setNotice({ tone, message })
  }

  const contextValue = useMemo(
    () => ({
      openMockDialog: <TOption extends MockResultOption<any, any>>(request: MockDialogRequest<TOption>) =>
        setMockRequest(request as unknown as AnyMockDialogRequest),
      openFeedbackDialog: (request: FeedbackDialogRequest) => setFeedbackRequest(request),
      showNotice,
    }),
    [],
  )

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const handleMockOptionSelect = (request: MockDialogRequest, option: MockResultOption) => {
    setMockRequest(null)
    request.onSelect(option)

    if (option.noticeMessage) {
      showNotice(option.noticeMessage, option.badge === 'error' ? 'error' : 'info')
      return
    }

    if (option.badge === 'error') {
      showNotice(option.title, 'error')
    }
  }

  const handleFeedbackSubmit = async (text: string) => {
    if (!feedbackRequest) {
      return
    }

    const trimmedText = text.trim()
    if (!trimmedText) {
      return
    }

    setIsSubmittingFeedback(true)
    const result = await sendAgentFeedback(buildFeedbackPayload(feedbackRequest, trimmedText))
    setIsSubmittingFeedback(false)
    showNotice(result.message, result.ok ? 'success' : 'error')

    if (result.ok) {
      setFeedbackRequest(null)
    }
  }

  return (
    <MockSystemContext.Provider value={contextValue}>
      {children}
      {mockRequest ? (
        <MockInteractionModal
          request={mockRequest}
          onClose={() => setMockRequest(null)}
          onOptionSelect={handleMockOptionSelect}
        />
      ) : null}
      {feedbackRequest ? (
        <FeedbackModal
          request={feedbackRequest}
          isSubmitting={isSubmittingFeedback}
          onClose={() => setFeedbackRequest(null)}
          onSubmit={handleFeedbackSubmit}
        />
      ) : null}
      {notice && notice.tone === 'error' ? (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[18] w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-full border border-destructive/20 bg-card/95 px-4 py-3 text-center text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
            {notice.message}
          </div>
        </div>
      ) : null}
      {notice && notice.tone !== 'error' ? (
        <div
          className={cn(
            'fixed right-4 bottom-4 z-[18] max-w-[min(420px,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
            notice.tone === 'success' && 'border-emerald-200 bg-card text-foreground',
            notice.tone === 'info' && 'border-border bg-card/95 text-foreground',
          )}
        >
          {notice.message}
        </div>
      ) : null}
    </MockSystemContext.Provider>
  )
}
