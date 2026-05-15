"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AdminDepartmentItem } from "@/types/portal"
import type { UserRole } from "@/types/auth"

const ROLES: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Сотрудник" },
  { value: "hr_manager", label: "HR-менеджер" },
  { value: "admin", label: "Администратор" },
]

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "employee" as UserRole,
  departmentId: "" as string,
}

export function AdminUsersCreateSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departments: AdminDepartmentItem[]
  onCreated: () => Promise<void>
}) {
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (props.open) {
      setForm(emptyForm)
      setError(null)
      setShowPassword(false)
    }
  }, [props.open])

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: {
        email: string
        password: string
        firstName: string
        lastName: string
        role: UserRole
        departmentId?: string
      } = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      }
      if (form.departmentId) {
        body.departmentId = form.departmentId
      }
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setError(data.error ?? "Не удалось создать пользователя")
        return
      }
      await props.onCreated()
      props.onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Создать пользователя</SheetTitle>
          <SheetDescription>
            Будет создана учётная запись и пустой профиль сотрудника. Пароль не короче 6 символов.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="create-firstName">Имя *</Label>
            <Input
              id="create-firstName"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-lastName">Фамилия *</Label>
            <Input
              id="create-lastName"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email (логин) *</Label>
            <Input
              id="create-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Пароль *</Label>
            <div className="flex gap-2">
              <Input
                id="create-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">Роль *</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}>
              <SelectTrigger id="create-role">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-dept">Подразделение</Label>
            <Select
              value={form.departmentId || "__none__"}
              onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger id="create-dept">
                <SelectValue placeholder="Не выбрано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не выбрано</SelectItem>
                {props.departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <SheetFooter className="border-t bg-background px-4 py-3">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" className="bg-[#16223b] hover:bg-[#16223b]/90" onClick={submit} disabled={saving}>
            Создать
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
