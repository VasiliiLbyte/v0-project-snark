"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  VACATION_TYPE_LABEL,
  formatVacationPeriod,
} from "@/lib/portal-data/vacations-ui"
import type { AdminVacationItem } from "@/types/portal"

interface AdminVacationsTableProps {
  initial: AdminVacationItem[]
}

export function AdminVacationsTable({ initial }: AdminVacationsTableProps) {
  const router = useRouter()
  const [items, setItems] = useState<AdminVacationItem[]>(initial)
  const [pending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setError(null)
    setActiveId(id)
    try {
      const comment =
        status === "rejected"
          ? typeof window !== "undefined"
            ? window.prompt("Комментарий к отказу (необязательно)") ?? undefined
            : undefined
          : undefined

      const response = await fetch(`/api/admin/vacations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, comment }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "Не удалось обновить заявку")
        return
      }
      setItems((current) => current.filter((item) => item.id !== id))
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setError("Сетевая ошибка при обновлении заявки")
    } finally {
      setActiveId(null)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground">Заявки на отпуск</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Согласуйте или отклоните поданные сотрудниками заявки на отпуск.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">На согласовании: {items.length}</span>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Нет заявок, ожидающих согласования.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Отдел</TableHead>
                <TableHead>Период</TableHead>
                <TableHead>Дней</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLoading = (pending && activeId === item.id) || activeId === item.id
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.authorName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.authorDepartment ?? "Без отдела"}
                    </TableCell>
                    <TableCell>{formatVacationPeriod(item.startDate, item.endDate)}</TableCell>
                    <TableCell>{item.daysTotal}</TableCell>
                    <TableCell>{VACATION_TYPE_LABEL[item.type]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-600/90"
                          onClick={() => handleAction(item.id, "approved")}
                          disabled={isLoading}
                        >
                          {isLoading ? "..." : "Утвердить"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(item.id, "rejected")}
                          disabled={isLoading}
                        >
                          Отклонить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
