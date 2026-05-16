import { useEffect, useState } from 'react'
import { Settings2, LogOut, KeyRound, UserRoundCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { SectionCard } from './workspace-shared'
import { useAdminSession } from '@/stores/use-admin-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function WorkspaceSettings() {
  const navigate = useNavigate()
  const session = useAdminSession((state) => state.session)
  const setSession = useAdminSession((state) => state.setSession)
  const clearSession = useAdminSession((state) => state.clearSession)

  const [displayName, setDisplayName] = useState(session?.username || 'AuthorDNA user')
  const [profileMessage, setProfileMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  useEffect(() => {
    setDisplayName(session?.username || 'AuthorDNA user')
  }, [session?.username])

  const handleProfileSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = displayName.trim()

    if (!nextName) {
      setProfileMessage('Display name cannot be empty.')
      return
    }

    setSession(nextName)
    setProfileMessage('Profile updated.')
  }

  const handlePasswordSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Please complete all password fields.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New password and confirmation do not match.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password updated in this demo session.')
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <SectionCard title="Settings" description="Manage account, theme, and workspace preferences." icon={Settings2}>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleProfileSave} className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <UserRoundCog className="size-4 text-brand" />
            <div className="text-sm font-medium">Profile</div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
            <div className="text-sm text-foreground/50">Current account: {session?.username || 'AuthorDNA user'}</div>
            {profileMessage ? <p className="text-sm text-foreground/60">{profileMessage}</p> : null}
            <Button type="submit" className="rounded-xl px-4">Save profile</Button>
          </div>
        </form>

        <form onSubmit={handlePasswordSave} className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <KeyRound className="size-4 text-brand" />
            <div className="text-sm font-medium">Password</div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            {passwordMessage ? <p className="text-sm text-foreground/60">{passwordMessage}</p> : null}
            <Button type="submit" variant="outline" className="rounded-xl px-4">Update password</Button>
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-card/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LogOut className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold text-foreground">Sign out</h2>
            <p className="text-sm leading-6 text-foreground/50">Leave the current account and return to the login screen.</p>
          </div>
          <Button type="button" onClick={handleLogout} className="rounded-xl px-4">
            Logout
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}