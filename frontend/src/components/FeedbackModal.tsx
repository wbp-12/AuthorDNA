import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { FeedbackDialogRequest } from '@/lib/mock-types'

import { ModalShell } from './ModalShell'

interface FeedbackModalProps {
  request: FeedbackDialogRequest
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (text: string) => Promise<void>
}

export function FeedbackModal({ request, isSubmitting, onClose, onSubmit }: FeedbackModalProps) {
  const [text, setText] = useState('')

  return (
    <ModalShell onClose={onClose}>
      <DialogHeader className="gap-3">
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">意见补充</p>
          <DialogTitle className="text-[1.8rem] leading-none text-[var(--text-strong)]">
            {request.title}
          </DialogTitle>
        </div>
      </DialogHeader>
      <DialogDescription className="text-[var(--muted)]">
        {request.description}
      </DialogDescription>
      <Separator />

      <div className="grid gap-3">
        <Label htmlFor="agent-feedback" className="font-semibold text-[var(--text-strong)]">
          发给智能体的文字反馈
        </Label>
        <Textarea
          id="agent-feedback"
          rows={6}
          value={text}
          className="min-h-[140px] resize-y rounded-[18px] bg-background/95 px-4 py-4 text-foreground shadow-none"
          placeholder="例如：登录成功后还缺少一个跳转到馆员总控台的分支，建议补一个工作台页面的模拟结果。"
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="grid gap-1 text-sm text-[var(--muted)]">
        <span>页面：{request.pageName}</span>
        <span>路由：{request.route}</span>
        <span>这段文字会先发给控制服务，再由它转发给当前智能体。</span>
      </div>

      <DialogFooter className="flex-wrap gap-3 sm:justify-start">
        <Button
          type="button"
          variant="secondary"
          className="min-h-13 rounded-[18px] px-5"
          onClick={onClose}
        >
          关闭
        </Button>
        <Button
          type="button"
          className="min-h-13 rounded-[18px] px-5"
          disabled={isSubmitting || text.trim().length === 0}
          onClick={() => onSubmit(text)}
        >
          {isSubmitting ? '发送中…' : '提交给智能体'}
        </Button>
      </DialogFooter>
    </ModalShell>
  )
}
