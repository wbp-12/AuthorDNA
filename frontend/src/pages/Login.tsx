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
  AdminCredentials,
  type AdminLoginRequest,
  type AdminLoginResponse,
} from '@/domain-types'
import { useMockSystem } from '@/hooks/useMockSystem'
import type { MockResultOption, PageEventDefinition } from '@/lib/mock-types'
import { useAdminSession } from '@/stores/use-admin-session'

const pageName = 'AuthorDNA 登录页'
const route = '/login'

type LoginResultId = 'login-success' | 'login-password-error' | 'login-account-error'
type LoginMockOption = MockResultOption<LoginResultId, AdminLoginResponse>

const mockOptions: LoginMockOption[] = [
  {
    id: 'login-success',
    title: '登录成功',
    description: '账号密码验证通过，返回成功结果并进入 AuthorDNA 工作台。',
    badge: 'success',
    noticeMessage: '登录成功，正在进入 AuthorDNA 工作台。',
    payload: {
      accountStatus: AdminAccountStatuses.Active,
      redirectTo: '/workspace/home',
    },
  },
  {
    id: 'login-password-error',
    title: '密码错误',
    description: '密码校验失败，返回失败结果并在表单下方显示错误提示。',
    badge: 'error',
    payload: {
      accountStatus: AdminAccountStatuses.PasswordInvalid,
      reason: '密码错误，请重新输入。',
    },
  },
  {
    id: 'login-account-error',
    title: '账号不存在',
    description: '账号未找到，返回失败结果并在表单下方显示错误提示。',
    badge: 'error',
    payload: {
      accountStatus: AdminAccountStatuses.NotFound,
      reason: '账号不存在，请检查用户名。',
    },
  },
]

export default function AdminLogin() {
  const navigate = useNavigate()
  const { openMockDialog } = useMockSystem()
  const setSession = useAdminSession((state) => state.setSession)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMockResult = (option: LoginMockOption, loginName: string) => {
    setIsSubmitting(false)

    const response = option.payload
    if (!response) {
      return
    }

    if (response.accountStatus === AdminAccountStatuses.Active) {
      setErrorMessage('')
      setSession(loginName)
      navigate(response.redirectTo)
      return
    }

    setErrorMessage(response.reason)
  }

  const handleSubmit = () => {
    const request: AdminLoginRequest = {
      credentials: AdminCredentials.fromForm(username, password),
    }

    if (!request.credentials.isComplete) {
      setErrorMessage('请输入你的 AuthorDNA ID 和密码。')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    openMockDialog({
      pageName,
      route,
      componentName: '登录按钮',
      interactionName: 'AuthorDNA 登录',
      title: '选择登录处理结果',
      description: '模拟用户提交 AuthorDNA 账号密码后的不同验证结果。',
      prioritySuggestion: '优先确认登录成功后的跳转，以及账号或密码错误时的提示文案。',
      options: mockOptions,
      onSelect: (option) => handleMockResult(option, request.credentials.username),
    })
  }

  const pageEvents: PageEventDefinition[] = [
    {
      id: 'enter-submit',
      label: '回车提交登录',
      description: '模拟在密码输入框中按回车键提交表单。',
      dialog: {
        pageName,
        route,
        eventName: '回车提交登录',
        interactionName: '键盘回车触发 AuthorDNA 登录',
        title: '选择回车提交结果',
        description: '模拟按下回车键后，以 AdminLoginRequest 提交登录并返回对应的 AdminLoginResponse。',
        options: mockOptions,
        onSelect: (option) => handleMockResult(option as LoginMockOption, username),
      },
    },
    {
      id: 'session-expired',
      label: '登录状态失效',
      description: '模拟用户因会话失效返回登录页后的错误提示。',
      dialog: {
        pageName,
        route,
        eventName: '登录状态失效',
        interactionName: '页面级异常提示',
        title: '选择状态失效后的页面反馈',
        description: '模拟用户被要求重新登录时的提示信息。',
        options: [
          {
            id: 'session-expired-message',
            title: '显示会话失效提示',
            description: '在错误提示区域展示重新登录文案。',
            badge: 'warning',
          },
          {
            id: 'session-expired-noop',
            title: '保持当前页面',
            description: '不展示额外提示，仅停留在当前登录页。',
            badge: 'info',
          },
        ],
        onSelect: (option: MockResultOption) => {
          setIsSubmitting(false)
          setErrorMessage(option.id === 'session-expired-message' ? '登录状态已失效，请重新登录。' : '')
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
                AuthorDNA Access
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
                  Login to Your AuthorDNA Workspace
                </h1>
                <p className="text-base leading-7 text-foreground/50">
                  Use your account to view, organize, and continue creating your personal AuthorDNA content.
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
                  <CardTitle className="font-sans text-xl text-foreground">AuthorDNA Login</CardTitle>
                </div>
              </div>
              <div className="hidden lg:block">
                <CardTitle className="font-sans text-2xl text-foreground">AuthorDNA Login</CardTitle>
              </div>
              <CardDescription className="text-sm leading-6 text-foreground/50">
                Enter your AuthorDNA ID and password to continue.
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
                  <Label htmlFor="admin-username" className="text-foreground">
                    AuthorDNA ID
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/50" />
                    <Input
                      id="admin-username"
                      value={username}
                      placeholder="Enter your AuthorDNA ID"
                      autoComplete="username"
                      className="h-11 rounded-xl border-foreground/20 bg-card pl-10 text-foreground placeholder:text-foreground/50 focus-visible:ring-highlight/80"
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/50" />
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      placeholder="Password here..."
                      autoComplete="current-password"
                      className="h-11 rounded-xl border-foreground/20 bg-card pl-10 text-foreground placeholder:text-foreground/50 focus-visible:ring-highlight/80"
                      onChange={(event) => setPassword(event.target.value)}
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
                  Login to AuthorDNA
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="h-auto w-full px-0 bg-transparent text-sm text-foreground/50 hover:text-foreground"
                  onClick={() => navigate('/register')}
                >
                  No AuthorDNA account? Sign up now
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="relative pb-8 text-center text-sm text-foreground/50">
        Copyright © 2025 AuthorDNA
      </footer>
    </main>
  )
}
