"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
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
  KNOWLEDGE_CATEGORY_LABEL,
  formatKnowledgeDate,
} from "@/lib/portal-data/knowledge-ui"
import type { KnowledgeListResponse } from "@/types/portal"

interface AdminKnowledgeTableProps {
  initial: KnowledgeListResponse
}

export function AdminKnowledgeTable({ initial }: AdminKnowledgeTableProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Удалить статью «${title}»? Это действие необратимо.`)) {
      return
    }
    setError(null)
    try {
      const response = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "Не удалось удалить статью")
        return
      }
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setError("Ошибка сети при удалении статьи")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">База знаний</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управление статьями корпоративной базы знаний.
          </p>
        </div>
        <Link href="/admin/knowledge/new">
          <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Создать статью</Button>
        </Link>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="p-4">
        {initial.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Здесь пока нет статей. Создайте первую публикацию.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заголовок</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Просмотры</TableHead>
                <TableHead>Обновлено</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-card-foreground">
                    {item.title}
                  </TableCell>
                  <TableCell>{KNOWLEDGE_CATEGORY_LABEL[item.category]}</TableCell>
                  <TableCell>
                    {item.isPublished ? (
                      <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700">
                        Опубликовано
                      </Badge>
                    ) : (
                      <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-700">
                        Черновик
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.viewsCount}</TableCell>
                  <TableCell>{formatKnowledgeDate(item.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/knowledge/${item.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Редактировать
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => void handleDelete(item.id, item.title)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
