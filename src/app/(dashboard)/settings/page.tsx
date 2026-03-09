'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { User, Globe, Bell, Lock, Users, UserPlus, Trash2, AlertTriangle } from 'lucide-react'
import { signOut } from 'next-auth/react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CURRENCIES = [
  { value: 'IDR', label: 'IDR - Rupiah Indonesia' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
]

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Bangkok',
  'UTC',
]

type PasswordFormData = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type MemberUser = { id: string; name: string; email: string; avatar?: string }
type WorkspaceMember = { userId: string; role: string; joinedAt: string; user: MemberUser }

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'OWNER') return 'default'
  if (role === 'ADMIN') return 'secondary'
  return 'outline'
}

export default function SettingsPage() {
  const { data: user, isLoading, mutate } = useSWR('/api/users/me', fetcher)
  const { data: members, mutate: mutateMembers } = useSWR<WorkspaceMember[]>('/api/workspaces/members', fetcher)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [isInviting, setIsInviting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', currency: 'IDR', timezone: 'Asia/Jakarta' },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    reset: resetPassword,
    formState: { isSubmitting: isSubmittingPassword, errors: passwordErrors },
  } = useForm<PasswordFormData>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name, currency: user.currency, timezone: user.timezone })
    }
  }, [user, reset])

  const onPasswordSubmit = async (data: PasswordFormData) => {
    const res = await fetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    })
    if (res.ok) {
      toast.success('Password berhasil diubah')
      resetPassword()
    } else {
      const json = await res.json()
      toast.error(json?.error ?? 'Gagal mengubah password')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Yakin ingin menghapus anggota ini?')) return
    const res = await fetch(`/api/workspaces/members/${memberId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Anggota berhasil dihapus')
      mutateMembers()
    } else {
      const json = await res.json()
      toast.error(json?.error ?? 'Gagal menghapus anggota')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setIsInviting(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        toast.success('Undangan berhasil dikirim')
        setInviteEmail('')
        setInviteRole('MEMBER')
        mutateMembers()
      } else {
        const json = await res.json()
        toast.error(json?.error ?? 'Gagal mengundang anggota')
      }
    } finally {
      setIsInviting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Masukkan password terlebih dahulu')
      return
    }
    setIsDeletingAccount(true)
    try {
      const res = await fetch('/api/users/me/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (res.ok) {
        toast.success('Akun berhasil dihapus')
        setDeleteDialogOpen(false)
        await signOut({ callbackUrl: '/' })
      } else {
        const json = await res.json()
        toast.error(json?.error ?? 'Gagal menghapus akun')
      }
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const onSubmit = async (data: any) => {
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Profil berhasil diperbarui')
      mutate()
    } else {
      toast.error('Gagal memperbarui profil')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pengaturan</h2>
        <p className="text-sm text-muted-foreground">Kelola profil dan preferensi akun Anda</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />Profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="bg-gray-50 dark:bg-gray-800" />
              <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input id="name" placeholder="Nama lengkap..." {...register('name', { required: true })} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Globe className="h-4 w-4" />Preferensi</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Uang Default</Label>
                <Select value={watch('currency')} onValueChange={(v) => v && setValue('currency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zona Waktu</Label>
                <Select value={watch('timezone')} onValueChange={(v) => v && setValue('timezone', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />Ganti Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Password saat ini..."
                {...registerPassword('currentPassword', { required: 'Password saat ini wajib diisi' })}
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-500">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Password baru (min. 8 karakter)..."
                {...registerPassword('newPassword', {
                  required: 'Password baru wajib diisi',
                  minLength: { value: 8, message: 'Password minimal 8 karakter' },
                })}
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-500">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password baru..."
                {...registerPassword('confirmPassword', {
                  required: 'Konfirmasi password wajib diisi',
                  validate: (value) =>
                    value === watchPassword('newPassword') || 'Password tidak cocok',
                })}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-500">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmittingPassword}>
              {isSubmittingPassword ? 'Menyimpan...' : 'Ubah Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workspace info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {user?.workspaces?.map((ws: any) => (
              <div key={ws.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">Role: {ws.role}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workspace Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />Anggota Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!members ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadgeVariant(m.role)}>{m.role}</Badge>
                    {user?.workspaces?.some((ws: any) => ws.role === 'OWNER') && m.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.userId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />Undang Anggota
            </p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="Email anggota..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Mengundang...' : 'Undang'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bergabung</span>
            <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-categorization — Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategorisasi Otomatis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">Em desenvolvimento — fitur ini segera hadir.</p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-300 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />Zona Berbahaya
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Hapus Akun</p>
              <p className="text-xs text-muted-foreground">
                Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus permanen.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Hapus Akun
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Akun</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus akun Anda secara permanen beserta semua data terkait.
              Masukkan password Anda untuk mengonfirmasi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Password</Label>
              <Input
                id="deletePassword"
                type="password"
                placeholder="Masukkan password Anda..."
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletePassword('')
              }}
              disabled={isDeletingAccount}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || !deletePassword}
            >
              {isDeletingAccount ? 'Menghapus...' : 'Hapus Akun Saya'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
