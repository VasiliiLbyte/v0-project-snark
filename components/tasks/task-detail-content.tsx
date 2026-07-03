"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Flame, Paperclip, Trash2 } from "lucide-react"
import { EmployeePicker } from "@/components/shared/employee-picker"
import { TaskInlineChat } from "@/components/tasks/task-inline-chat"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { Employee, TaskDetail, TaskPriority, TaskStatus } from "@/types/portal"

interface TaskDetailContentProps {
  task: TaskDetail
  employees: Employee[]
  currentUserId: string
}

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

export function TaskDetailContent({
  task: initial,
  employees,
  currentUserId,
}: TaskDetailContentProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const completeFileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [task, setTask] = useState(initial)
  const [title, setTitle] = useState(initial.title)
  const [checklistTitle, setChecklistTitle] = useState("")
  const [commentBody, setCommentBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completionResult, setCompletionResult] = useState("")
  const [completeFile, setCompleteFile] = useState<File | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(null)

  const watchers = task.participants.filter((p) => p.role === "watcher")
  const canDelete =
    task.creatorId === currentUserId || false // admin check on server

  const refresh = () => startTransition(() => router.refresh())

  const applyTask = (next: TaskDetail) => {
    setTask(next)
    setTitle(next.title)
  }

  const patchTask = async (payload: Record<string, unknown>) => {
    setError(null)
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setError(body.error ?? "Не удалось обновить задачу")
      return null
    }
    const body = (await response.json()) as { item: TaskDetail }
    applyTask(body.item)
    refresh()
    return body.item
  }

  const startTask = () => void patchTask({ status: "in_progress" })

  const toggleImportant = () => void patchTask({ isImportant: !task.isImportant })

  const saveTitle = () => {
    if (title.trim() && title.trim() !== task.title) {
      void patchTask({ title: title.trim() })
    }
  }

  const addWatcher = async () => {
    if (!selectedWatcherId) return
    const response = await fetch(`/api/tasks/${task.id}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: selectedWatcherId, role: "watcher" }),
    })
    if (!response.ok) return
    const body = (await response.json()) as { item: TaskDetail }
    applyTask(body.item)
    setSelectedWatcherId(null)
  }

  const removeWatcher = async (userId: string) => {
    const response = await fetch(
      `/api/tasks/${task.id}/participants?userId=${userId}&role=watcher`,
      { method: "DELETE" }
    )
    if (!response.ok) return
    const body = (await response.json()) as { item: TaskDetail }
    applyTask(body.item)
  }

  const uploadAttachment = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`/api/tasks/${task.id}/attachments`, {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      setError("Не удалось загрузить файл")
      return
    }
    refresh()
    const detailRes = await fetch(`/api/tasks/${task.id}`)
    if (detailRes.ok) {
      const body = (await detailRes.json()) as { item: TaskDetail }
      if (body.item) applyTask(body.item)
    }
  }

  const submitComplete = async () => {
    if (!completionResult.trim()) return
    const formData = new FormData()
    formData.append("completionResult", completionResult.trim())
    if (completeFile) formData.append("file", completeFile)
    const response = await fetch(`/api/tasks/${task.id}/complete`, {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      setError("Не удалось завершить задачу")
      return
    }
    const body = (await response.json()) as { item: TaskDetail | null }
    if (!body.item) {
      setError("Задача завершена, но не удалось обновить карточку")
      return
    }
    applyTask(body.item)
    setCompleteOpen(false)
    setCompletionResult("")
    setCompleteFile(null)
  }

  const deleteTask = async () => {
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    if (!response.ok) {
      setError("Не удалось удалить задачу")
      return
    }
    router.push("/tasks")
    router.refresh()
  }

  const addChecklistItem = async () => {
    if (!checklistTitle.trim()) return
    const response = await fetch(`/api/tasks/${task.id}/checklist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: checklistTitle.trim() }),
    })
    if (!response.ok) return
    const body = (await response.json()) as { item: TaskDetail["checklist"][number] }
    setTask((prev) => ({ ...prev, checklist: [...prev.checklist, body.item] }))
    setChecklistTitle("")
  }

  const toggleChecklistItem = async (itemId: string, isDone: boolean) => {
    const response = await fetch(`/api/tasks/${task.id}/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDone }),
    })
    if (!response.ok) return
    const body = (await response.json()) as { item: TaskDetail["checklist"][number] }
    setTask((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) => (item.id === itemId ? body.item : item)),
    }))
  }

  const addComment = async () => {
    if (!commentBody.trim()) return
    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: commentBody.trim() }),
    })
    if (!response.ok) return
    const body = (await response.json()) as { item: TaskDetail["comments"][number] }
    setTask((prev) => ({ ...prev, comments: [...prev.comments, body.item] }))
    setCommentBody("")
  }

  const doneCount = task.checklist.filter((item) => item.isDone).length
  const isActive = task.status !== "done" && task.status !== "cancelled"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tasks" className="text-sm text-muted-foreground hover:underline">
            ← К списку задач
          </Link>
          <div className="mt-2 flex items-start gap-2">
            <Button
              type="button"
              size="icon"
              variant={task.isImportant ? "default" : "outline"}
              className={cn(task.isImportant && "bg-orange-500 hover:bg-orange-600")}
              title="Важная задача"
              onClick={toggleImportant}
            >
              <Flame className="h-4 w-4" />
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TASK_STATUS_LABEL[task.status]}</Badge>
            <Badge variant="outline">{TASK_PRIORITY_LABEL[task.priority]}</Badge>
            {task.isImportant ? <Badge className="bg-orange-500">Важная</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive && task.status === "new" ? (
            <Button onClick={startTask}>Начать</Button>
          ) : null}
          {isActive && task.status !== "new" ? (
            <Button onClick={() => setCompleteOpen(true)}>Завершить</Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="mr-2 h-4 w-4" />
            Файл
          </Button>
          <Button type="button" variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void uploadAttachment(file)
          e.target.value = ""
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Описание</h2>
            <Textarea
              defaultValue={task.description ?? ""}
              rows={4}
              placeholder="Описание задачи..."
              onBlur={(event) => {
                const value = event.target.value.trim()
                if (value !== (task.description ?? "")) {
                  void patchTask({ description: value || null })
                }
              }}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-due-detail">Крайний срок</Label>
                <Input
                  id="task-due-detail"
                  type="date"
                  defaultValue={task.dueDate ?? ""}
                  onBlur={(event) => {
                    const value = event.target.value || null
                    if (value !== task.dueDate) void patchTask({ dueDate: value })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => void patchTask({ priority: value as TaskPriority })}
                >
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
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Участники</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Постановщик</Label>
                <p className="font-medium">{task.creatorName}</p>
              </div>
              <div className="space-y-2">
                <Label>Исполнитель</Label>
                <EmployeePicker
                  employees={employees}
                  value={task.assigneeId}
                  onChange={(value) => void patchTask({ assigneeId: value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Наблюдатели</Label>
              <div className="flex flex-wrap gap-2">
                {watchers.map((w) => (
                  <Badge key={w.id} variant="secondary" className="gap-1">
                    {w.userName}
                    <button type="button" className="ml-1" onClick={() => void removeWatcher(w.userId)}>
                      ×
                    </button>
                  </Badge>
                ))}
                {watchers.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Не назначены</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <EmployeePicker
                  employees={employees.filter(
                    (e) =>
                      e.userId !== task.creatorId &&
                      e.userId !== task.assigneeId &&
                      !watchers.some((w) => w.userId === e.userId)
                  )}
                  value={selectedWatcherId}
                  onChange={setSelectedWatcherId}
                  placeholder="Добавить наблюдателя"
                />
                <Button type="button" variant="outline" onClick={() => void addWatcher()}>
                  Добавить
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Вложения</h2>
            {task.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Файлов пока нет</p>
            ) : (
              <ul className="space-y-2">
                {task.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {file.fileName}
                      {file.attachmentType === "completion" ? " (результат)" : ""}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {task.status === "done" && task.completionResult ? (
            <Card className="p-6 space-y-2">
              <h2 className="text-lg font-semibold">Результат</h2>
              <p className="text-sm whitespace-pre-wrap">{task.completionResult}</p>
            </Card>
          ) : null}

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Чек-лист</h2>
              {task.checklist.length > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {doneCount}/{task.checklist.length}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {task.checklist.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={item.isDone}
                    onCheckedChange={(checked) =>
                      void toggleChecklistItem(item.id, checked === true)
                    }
                  />
                  <span className={item.isDone ? "line-through text-muted-foreground" : ""}>
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={checklistTitle}
                onChange={(event) => setChecklistTitle(event.target.value)}
                placeholder="Новый пункт"
              />
              <Button type="button" variant="outline" onClick={() => void addChecklistItem()}>
                Добавить
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Комментарии</h2>
            <div className="space-y-3">
              {task.comments.map((comment) => (
                <div key={comment.id} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {comment.authorName} · {formatDate(comment.createdAt)}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={2}
                placeholder="Комментарий..."
              />
              <Button type="button" onClick={() => void addComment()}>
                Отправить
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Чат задачи</h2>
            <TaskInlineChat taskId={task.id} currentUserId={currentUserId} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-3 text-sm">
            <h2 className="text-lg font-semibold">Сведения</h2>
            <div>
              <span className="text-muted-foreground">Статус:</span> {TASK_STATUS_LABEL[task.status]}
            </div>
            <div>
              <span className="text-muted-foreground">Срок:</span> {formatDate(task.dueDate)}
            </div>
            <div>
              <span className="text-muted-foreground">Создана:</span> {formatDate(task.createdAt)}
            </div>
            {task.completedAt ? (
              <div>
                <span className="text-muted-foreground">Завершена:</span>{" "}
                {formatDate(task.completedAt)}
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершение задачи</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="completion-result">Результат выполнения *</Label>
              <Textarea
                id="completion-result"
                value={completionResult}
                onChange={(e) => setCompletionResult(e.target.value)}
                rows={4}
                placeholder="Опишите результат..."
              />
            </div>
            <div className="space-y-2">
              <Label>Файл результата (необязательно)</Label>
              <Input
                ref={completeFileRef}
                type="file"
                onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitComplete()} disabled={!completionResult.trim()}>
              Завершить задачу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить задачу?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Задача «{task.title}» будет удалена без возможности восстановления.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={() => void deleteTask()}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {pending ? <p className="text-sm text-muted-foreground">Обновление...</p> : null}
    </div>
  )
}
