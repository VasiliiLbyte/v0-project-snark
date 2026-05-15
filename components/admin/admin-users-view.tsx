"use client"

import { useCallback, useEffect, useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { AdminUsersCreateSheet } from "@/components/admin/admin-users-create-sheet"
import { AdminUsersCredentialsDialog } from "@/components/admin/admin-users-credentials-dialog"
import { AdminUsersRoleDialog } from "@/components/admin/admin-users-role-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import type { AdminDepartmentItem, AdminPortalUserItem } from "@/types/portal"
import type { UserRole } from "@/types/auth"

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${formatDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function roleBadge(role: UserRole) {
  if (role === "admin") {
    return (
      <Badge className="border border-red-200 bg-red-100 text-red-900 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        Администратор
      </Badge>
    )
  }
  if (role === "hr_manager") {
    return (
      <Badge className="border border-blue-200 bg-blue-100 text-blue-900 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        HR-менеджер
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Сотрудник
    </Badge>
  )
}

export function AdminUsersView() {
  const { user } = useAuth()
  const [items, setItems] = useState<AdminPortalUserItem[]>([])
  const [departments, setDepartments] = useState<AdminDepartmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleUser, setRoleUser] = useState<AdminPortalUserItem | null>(null)
  const [credUser, setCredUser] = useState<AdminPortalUserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminPortalUserItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store", credentials: "include" })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      throw new Error(body.error ?? "Не удалось загрузить список")
    }
    const data = (await response.json()) as { items: AdminPortalUserItem[] }
    setItems(data.items)
  }, [])

  const loadDepartments = useCallback(async () => {
    const response = await fetch("/api/admin/departments", { cache: "no-store", credentials: "include" })
    if (!response.ok) return
    const data = (await response.json()) as { items: AdminDepartmentItem[] }
    setDepartments(data.items)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        await Promise.all([loadUsers(), loadDepartments()])
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Ошибка загрузки")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadUsers, loadDepartments])

  const toggleActive = async (row: AdminPortalUserItem) => {
    const next = !row.isActive
    const response = await fetch(`/api/admin/users/${row.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: next }),
    })
    if (!response.ok) {
      const body = (await response.json()) as { error?: string }
      setLoadError(body.error ?? "Не удалось изменить статус")
      return
    }
    await loadUsers()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setLoadError(body.error ?? "Не удалось удалить пользователя")
        return
      }
      setDeleteTarget(null)
      await loadUsers()
    } finally {
      setDeleteLoading(false)
    }
  }

  const isSelf = (id: string) => user?.id === id

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Управление пользователями</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Учётные записи: роли, логины и пароли. Пароли никогда не отображаются в интерфейсе.
            </p>
          </div>
          <Button
            type="button"
            className="bg-[#16223b] hover:bg-[#16223b]/90"
            onClick={() => setCreateOpen(true)}
          >
            Создать пользователя
          </Button>
        </div>
      </Card>

      {loadError ? (
        <Card className="border-destructive/50 p-4 text-sm text-destructive">{loadError}</Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Здесь пока нет пользователей. Создайте первую учётную запись.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Email (логин)</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Отдел</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Последний вход</TableHead>
                  <TableHead className="w-[72px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(!row.isActive && "bg-muted/60 text-muted-foreground [&>td]:opacity-80")}
                  >
                    <TableCell className="font-medium">
                      {row.lastName} {row.firstName}
                    </TableCell>
                    <TableCell>
                      <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                    </TableCell>
                    <TableCell>{roleBadge(row.role)}</TableCell>
                    <TableCell>{row.isActive ? "Активен" : "Заблокирован"}</TableCell>
                    <TableCell>{row.departmentName ?? "—"}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.lastLoginAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Действия для ${row.lastName} ${row.firstName}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            disabled={isSelf(row.id)}
                            onSelect={() => {
                              if (!isSelf(row.id)) setRoleUser(row)
                            }}
                          >
                            Изменить роль
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setCredUser(row)}>Изменить логин/пароль</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isSelf(row.id)}
                            onSelect={() => {
                              if (!isSelf(row.id)) void toggleActive(row)
                            }}
                          >
                            {row.isActive ? "Заблокировать" : "Разблокировать"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            disabled={isSelf(row.id)}
                            onSelect={() => {
                              if (!isSelf(row.id)) {
                                setTimeout(() => setDeleteTarget(row), 0)
                              }
                            }}
                          >
                            Удалить пользователя
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <AdminUsersCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        onCreated={loadUsers}
      />

      {roleUser ? (
        <AdminUsersRoleDialog
          open
          onOpenChange={(open) => {
            if (!open) setRoleUser(null)
          }}
          userId={roleUser.id}
          initialRole={roleUser.role}
          onSaved={loadUsers}
        />
      ) : null}

      {credUser ? (
        <AdminUsersCredentialsDialog
          open
          onOpenChange={(open) => {
            if (!open) setCredUser(null)
          }}
          userId={credUser.id}
          currentEmail={credUser.email}
          onSaved={loadUsers}
        />
      ) : null}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Учётная запись ${deleteTarget.lastName} ${deleteTarget.firstName} (${deleteTarget.email}) будет удалена без возможности восстановления. Профиль сотрудника и активные сессии входа будут удалены.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Отмена</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void confirmDelete()}
            >
              {deleteLoading ? "Удаление…" : "Удалить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
