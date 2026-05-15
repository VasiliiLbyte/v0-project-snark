"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminUsersCredentialsDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentEmail: string
  onSaved: () => Promise<void>
}) {
  const [email, setEmail] = useState(props.currentEmail)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = (open: boolean) => {
    if (!open) setError(null)
    props.onOpenChange(open)
    if (open) {
      setEmail(props.currentEmail)
      setPassword("")
      setShowPassword(false)
    }
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    const body: { email?: string; password?: string } = {}
    if (email.trim().toLowerCase() !== props.currentEmail.trim().toLowerCase()) {
      body.email = email.trim().toLowerCase()
    }
    if (password.trim().length > 0) {
      body.password = password
    }
    if (Object.keys(body).length === 0) {
      setError("Измените email или укажите новый пароль")
      setSaving(false)
      return
    }
    try {
      const response = await fetch(`/api/admin/users/${props.userId}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setError(data.error ?? "Не удалось сохранить изменения")
        return
      }
      await props.onSaved()
      handleOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Логин и пароль</DialogTitle>
          <DialogDescription>
            Текущий пароль нельзя просмотреть. Можно только задать новый. Текущий email:{" "}
            <span className="font-medium text-foreground">{props.currentEmail}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="admin-user-email">Email (логин)</Label>
            <Input
              id="admin-user-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-password">Новый пароль</Label>
            <div className="flex gap-2">
              <Input
                id="admin-user-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Оставьте пустым чтобы не менять"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Текущий пароль нельзя просмотреть. Можно только задать новый.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpen(false)} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" className="bg-[#16223b] hover:bg-[#16223b]/90" onClick={submit} disabled={saving}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
