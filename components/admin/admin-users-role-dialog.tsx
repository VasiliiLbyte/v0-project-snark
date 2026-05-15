"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/types/auth"

const ROLES: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Сотрудник" },
  { value: "hr_manager", label: "HR-менеджер" },
  { value: "admin", label: "Администратор" },
]

export function AdminUsersRoleDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  initialRole: UserRole
  onSaved: () => Promise<void>
}) {
  const [role, setRole] = useState<UserRole>(props.initialRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = (open: boolean) => {
    if (!open) setError(null)
    props.onOpenChange(open)
  }

  useEffect(() => {
    if (props.open) {
      setRole(props.initialRole)
    }
  }, [props.open, props.initialRole])

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${props.userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setError(body.error ?? "Не удалось сохранить роль")
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
          <DialogTitle>Изменить роль</DialogTitle>
          <DialogDescription>Выберите новую роль пользователя в системе.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="admin-user-role">Роль</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger id="admin-user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
