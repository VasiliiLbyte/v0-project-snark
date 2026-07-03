"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Flame, MessageSquare, Paperclip, Play, Trash2 } from "lucide-react"
import { EmployeePicker } from "@/components/shared/employee-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABEL,
} from "@/lib/portal-data/tasks-ui"
import { cn } from "@/lib/utils"
import type { Employee, PortalTask, TaskPriority, TasksListResponse } from "@/types/portal"

interface TasksPageContentProps {
  initial: TasksListResponse
  employees: Employee[]
  currentUserId: string
}

type TabFilter = "all" | "mine" | "assigned" | "important"

function formatDate(value: string | null): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function isOverdue(task: PortalTask): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "cancelled") return false
  return new Date(task.dueDate) < new Date(new Date().toDateString())
}

export function TasksPageContent({ initial, employees, currentUserId }: TasksPageContentProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabFilter>("all")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [watcherIds, setWatcherIds] = useState<string[]>([])
  const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(null)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completeTask, setCompleteTask] = useState<PortalTask | null>(null)
  const [completionResult, setCompletionResult] = useState("")
  const [completeFile, setCompleteFile] = useState<File | null>(null)

  const tasks = useMemo(() => {
    let list = initial.items
    if (tab === "important") list = list.filter((t) => t.isImportant)
    if (tab === "mine") {
      list = list.filter(
        (t) =>
          t.status === "in_progress" &&
          (t.assigneeId === currentUserId || t.creatorId === currentUserId)
      )
    }
    return list
  }, [initial.items, tab, currentUserId])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError("Укажите название задачи")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          assigneeId,
          watcherIds: watcherIds.length > 0 ? watcherIds : undefined,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "Не удалось создать задачу")
        return
      }
      const body = (await response.json()) as { item: PortalTask }
      if (createFile) {
        const formData = new FormData()
        formData.append("file", createFile)
        await fetch(`/api/tasks/${body.item.id}/attachments`, { method: "POST", body: formData })
      }
      router.push(`/tasks/${body.item.id}`)
    } catch {
      setError("Сетевая ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  const patchStatus = async (taskId: string, status: PortalTask["status"]) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    })
    startTransition(() => router.refresh())
  }

  const toggleImportant = async (task: PortalTask) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isImportant: !task.isImportant }),
    })
    startTransition(() => router.refresh())
  }

  const submitComplete = async () => {
    if (!completeTask || !completionResult.trim()) return
    const formData = new FormData()
    formData.append("completionResult", completionResult.trim())
    if (completeFile) formData.append("file", completeFile)
    const response = await fetch(`/api/tasks/${completeTask.id}/complete`, { method: "POST", body: formData })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setError(body.error ?? "Не удалось завершить задачу")
      return
    }
    setCompleteTask(null)
    setCompletionResult("")
    setCompleteFile(null)
    startTransition(() => router.refresh())
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("Удалить задачу?")) return
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    startTransition(() => router.refresh())
  }

  const openTaskChat = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/chat`)
    if (!response.ok) {
      setError("Не удалось открыть чат задачи")
      return
    }
    const body = (await response.json()) as { channelId: string | null }
    if (!body.channelId) {
      setError("Чат задачи не создан")
      return
    }
    router.push(`/chat?channel=${body.channelId}`)
  }

  const tabs: { id: TabFilter; label: string }[] = [
    { id: "all", label: "Все задачи" },
    { id: "mine", label: "В работе" },
    { id: "important", label: "Важные" },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold">Задачи</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Список поручений — как в Bitrix24: роли, сроки, файлы, чат задачи.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 border-t pt-6">
          <h2 className="font-medium">Новая задача</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-title">Название *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Подготовить отчёт"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-description">Описание</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Крайний срок</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TASK_PRIORITY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <EmployeePicker employees={employees} value={assigneeId} onChange={setAssigneeId} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Наблюдатели</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {watcherIds.map((id) => {
                  const employee = employees.find((e) => e.userId === id)
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {employee?.name ?? id}
                      <button
                        type="button"
                        className="ml-1"
                        onClick={() => setWatcherIds((prev) => prev.filter((w) => w !== id))}
                      >
                        ×
                      </button>
                    </Badge>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <EmployeePicker
                  employees={employees.filter(
                    (e) =>
                      e.userId !== assigneeId &&
                      !watcherIds.includes(e.userId)
                  )}
                  value={selectedWatcherId}
                  onChange={setSelectedWatcherId}
                  placeholder="Добавить наблюдателя"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (selectedWatcherId && !watcherIds.includes(selectedWatcherId)) {
                      setWatcherIds((prev) => [...prev, selectedWatcherId])
                      setSelectedWatcherId(null)
                    }
                  }}
                >
                  Добавить
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Прикрепить файл
              </Label>
              <Input type="file" onChange={(e) => setCreateFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={submitting || pending}>
            Поставить задачу
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b pb-4">
          {tabs.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={tab === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            Всего: {initial.total}
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Задач нет</p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => {
              const overdue = isOverdue(task)
              const active = task.status !== "done" && task.status !== "cancelled"
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0",
                    overdue && "bg-destructive/5 -mx-2 px-2 rounded-md"
                  )}
                >
                  <Button
                    type="button"
                    size="icon"
                    variant={task.isImportant ? "default" : "ghost"}
                    className={cn("shrink-0", task.isImportant && "bg-orange-500 hover:bg-orange-600")}
                    onClick={() => void toggleImportant(task)}
                    title="Важная"
                  >
                    <Flame className="h-4 w-4" />
                  </Button>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {task.title}
                    </Link>
                    {task.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Постановщик: {task.creatorName}</span>
                      {task.assigneeName ? <span>· Исполнитель: {task.assigneeName}</span> : null}
                    </div>
                  </div>

                  <Badge variant={overdue ? "destructive" : "secondary"}>
                    {TASK_STATUS_LABEL[task.status]}
                  </Badge>
                  <span className={cn("text-sm whitespace-nowrap", overdue && "text-destructive font-medium")}>
                    {formatDate(task.dueDate)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {TASK_PRIORITY_LABEL[task.priority]}
                  </span>

                  <div className="flex flex-wrap gap-1">
                    {active && task.status === "new" ? (
                      <Button size="sm" variant="outline" onClick={() => void patchStatus(task.id, "in_progress")}>
                        <Play className="mr-1 h-3 w-3" />
                        Начать
                      </Button>
                    ) : null}
                    {active && task.status !== "new" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setCompleteTask(task)
                          setCompletionResult("")
                        }}
                      >
                        Завершить
                      </Button>
                    ) : null}
                    <Button size="icon" variant="ghost" title="Чат" onClick={() => void openTaskChat(task.id)}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Удалить" onClick={() => void deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Dialog open={Boolean(completeTask)} onOpenChange={(open) => !open && setCompleteTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершить: {completeTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Результат выполнения *</Label>
              <Textarea
                value={completionResult}
                onChange={(e) => setCompletionResult(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Файл (необязательно)
              </Label>
              <Input type="file" onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTask(null)}>
              Отмена
            </Button>
            <Button onClick={() => void submitComplete()} disabled={!completionResult.trim()}>
              Завершить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
