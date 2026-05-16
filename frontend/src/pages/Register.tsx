import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, Sparkles, UserRound } from 'lucide-react'

import { FloatingPageTools } from '@/components/FloatingPageTools'
import { FloatingThemeToggle } from '@/components/FloatingThemeToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AdminAccountStatuses,
  AdminRegistrationDraft,
  type AdminRegisterRequest,
  type AdminRegisterResponse,
} from '@/domain-types'
import { useMockSystem } from '@/hooks/useMockSystem'
import type { MockResultOption, PageEventDefinition } from '@/lib/mock-types'

const pageName = 'AuthorDNA Register Page'
const route = '/register'

type RegisterResultId = 'register-success' | 'register-account-exists' | 'register-save-failed'
type RegisterMockOption = MockResultOption<RegisterResultId, AdminRegisterResponse>

const mockOptions: RegisterMockOption[] = [
  {
    id: 'register-success',
    title: 'Registration Successful',
    description: 'AuthorDNA account created successfully, returning a successful result and redirecting to the login page.',
    badge: 'success',
    noticeMessage: '注册成功，请使用新账号登录。',
    payload: {
      accountStatus: AdminAccountStatuses.Active,
      redirectTo: '/login',
    },
  },
  {
    id: 'register-account-exists',
    title: 'Username Already Exists',
    description: 'Username already exists, returning a failure result and displaying an error message below the form.',
    badge: 'error',
    payload: {
      accountStatus: AdminAccountStatuses.NotFound,
      reason: 'Username already exists, please choose another one and try again.',
    },
  },
  {
    id: 'register-save-failed',
    title: 'Registration Failed',
    description: 'Account save failed, returning a failure result and displaying an error message below the form.',
    badge: 'error',
    payload: {
      accountStatus: AdminAccountStatuses.PasswordInvalid,
      reason: 'Registration failed, please try again later.',
    },
  },
]

export default function AdminRegister() {
  const navigate = useNavigate()
  const { openMockDialog } = useMockSystem()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMockResult = (option: RegisterMockOption) => {
    setIsSubmitting(false)

    const response = option.payload
    if (!response) {
      return
    }

    if (response.accountStatus === AdminAccountStatuses.Active) {
      setErrorMessage('')
      navigate(response.redirectTo)
      return
    }

    setErrorMessage(response.reason)
  }

  const handleSubmit = () => {
    const request: AdminRegisterRequest = {
      draft: AdminRegistrationDraft.fromForm(username, password, confirmPassword),
    }

    if (!request.draft.isComplete || !request.draft.confirmPassword) {
      setErrorMessage('Please complete all registration fields.')
      return
    }

    if (!request.draft.passwordsMatch) {
      setErrorMessage('The passwords you entered do not match.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    openMockDialog({
      pageName,
      route,
      componentName: '注册按钮',
      interactionName: 'AuthorDNA 注册',
      title: '选择注册处理结果',
      description: '模拟用户提交 AuthorDNA 注册信息后的不同处理结果。',
      prioritySuggestion: '优先确认注册成功后的跳转，以及用户名冲突或保存失败时的提示文案。',
      options: mockOptions,
      onSelect: handleMockResult,
    })
  }

  const pageEvents: PageEventDefinition[] = [
    {
      id: 'enter-submit-register',
      label: '回车提交注册',
      description: '模拟在确认密码输入框中按回车键提交表单。',
      dialog: {
        pageName,
        route,
        eventName: '回车提交注册',
        interactionName: '键盘回车触发 AuthorDNA 注册',
        title: '选择回车提交结果',
        description: '模拟按下回车键后，以 AdminRegisterRequest 提交注册并返回对应的 AdminRegisterResponse。',
        options: mockOptions,
        onSelect: (option) => handleMockResult(option as RegisterMockOption),
      },
    },
    {
      id: 'prefill-register-form',
      label: '填充示例账号',
      description: '模拟页面自动填入一组 AuthorDNA 注册信息。',
      dialog: {
        pageName,
        route,
        eventName: '填充示例账号',
        interactionName: '页面级表单填充',
        title: '选择填充结果',
        description: '模拟页面为用户快速填充一组注册示例数据。',
        options: [
          {
            id: 'prefill-register-form-confirm',
            title: '填充示例信息',
            description: '将用户名和密码字段填入一组可提交的示例内容。',
            badge: 'info',
            noticeMessage: '已填充示例注册信息。',
          },
          {
            id: 'prefill-register-form-cancel',
            title: '保持当前内容',
            description: '不对当前表单内容做任何修改。',
            badge: 'warning',
          },
        ],
        onSelect: (option: MockResultOption) => {
          setIsSubmitting(false)

          if (option.id !== 'prefill-register-form-confirm') {
            return
          }

          setUsername('author_dna_member')
          setPassword('Author@123')
          setConfirmPassword('Author@123')
          setErrorMessage('')
        },
      },
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: 'var(--app-bg-gradient)' }}>
      <div className="absolute inset-0 bg-gradient-background" />
      <div className="absolute inset-x-0 top-0 h-72 opacity-70" style={{ background: 'var(--app-top-gradient)' }} />

      <FloatingPageTools
        events={pageEvents}
        onEventSelect={(event) => openMockDialog(event.dialog)}
      />

      <FloatingThemeToggle />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:block">
            <div className="max-w-md space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-foreground/5 bg-foreground/10 px-4 py-2 text-sm text-foreground shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
                <Sparkles className="size-4 text-brand" />
                Create your AuthorDNA account
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
                  Start with Your AuthorDNA Account
                </h1>
                <p className="text-base leading-7 text-foreground/50">
                  Create an account to save your preferences, view content, and continue with subsequent analysis.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-foreground/10 bg-foreground/5 py-0 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <CardHeader className="gap-4 px-7 pt-7 pb-2 sm:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-sans text-xl text-foreground">Sign up to AuthorDNA</CardTitle>
                </div>
              </div>
              <div className="hidden lg:block">
                <CardTitle className="font-sans text-2xl text-foreground">Sign up to AuthorDNA</CardTitle>
              </div>
              <CardDescription className="text-sm leading-6 text-foreground/50">
                Create an AuthorDNA account to save your personal information and preferences.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-7 py-7 sm:px-8">
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleSubmit()
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-foreground">
                    AuthorDNA ID
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="register-username"
                      value={username}
                      placeholder="Set your AuthorDNA ID"
                      autoComplete="username"
                      className="h-11 rounded-xl border-foreground/20 bg-card pl-10 text-foreground placeholder:text-foreground/50 focus-visible:ring-highlight/80"
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/50" />
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      placeholder="Set your login password"
                      autoComplete="new-password"
                      className="h-11 rounded-xl border-foreground/20 bg-card pl-10 text-foreground placeholder:text-foreground/50 focus-visible:ring-highlight/80"
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/50" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={confirmPassword}
                      placeholder="Enter your password again"
                      autoComplete="new-password"
                      className="h-11 rounded-xl border-foreground/20 bg-card pl-10 text-foreground placeholder:text-foreground/50 focus-visible:ring-highlight/80"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="min-h-2">
                  {errorMessage ? (
                    <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/90">
                      <AlertDescription className="text-sm text-rose-700">
                        {errorMessage}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-xl bg-brand text-base font-medium text-white hover:bg-brand/90"
                  disabled={isSubmitting}
                >
                  Create Account
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="h-auto w-full px-0 bg-transparent text-sm text-foreground/50 hover:text-foreground"
                  onClick={() => navigate('/login')}
                >
                  Already have an account? Return to login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="relative pb-8 text-center text-sm text-slate-500">
        Copyright © 2025 AuthorDNA
      </footer>
    </main>
  )
}
