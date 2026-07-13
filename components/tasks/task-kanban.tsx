"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_STATUS_OPTIONS } from "@/lib/portal-data/tasks-ui"
import { isTaskOverdue } from "@/lib/tasks/overdue"
import type { PortalTask, TaskStatus } from "@/types/portal"

interface TaskKanbanProps {
  tasks: PortalTask[]
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void> | void
}

function formatDue(value: string | null): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(value))
  } catch {
    return value
  }
}

export function TaskKanban({ tasks, onStatusChange }: TaskKanbanProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({})

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, PortalTask[]>()
    for (const status of TASK_STATUS_OPTIONS) map.set(status, [])
    for (const task of tasks) {
      const status = optimistic[task.id] ?? task.status
      map.get(status)?.push({ ...task, status })
    }
    return map
  }, [tasks, optimistic])

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const current = tasks.find((t) => t.id === taskId)
    if (!current || (optimistic[taskId] ?? current.status) === status) return
    setOptimistic((prev) => ({ ...prev, [taskId]: status }))
    try {
      if (onStatusChange) {
        await onStatusChange(taskId, status)
      } else {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        })
      }
      startTransition(() => router.refresh())
    } catch {
      setOptimistic((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    }
  }

  return (
    <div className={cn("grid gap-3 overflow-x-auto pb-2 md:grid-cols-5", pending && "opacity-90")}>
      {TASK_STATUS_OPTIONS.map((status) => {
        const items = columns.get(status) ?? []
        return (
          <div
            key={status}
            className="min-w-[220px] rounded-lg border bg-muted/30 p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const taskId = event.dataTransfer.getData("text/task-id") || draggingId
              if (taskId) void moveTask(taskId, status)
              setDraggingId(null)
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">Пусто</p>
              ) : (
                items.map((task) => {
                  const overdue = task.isOverdue ?? isTaskOverdue(task)
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        setDraggingId(task.id)
                        event.dataTransfer.setData("text/task-id", task.id)
                        event.dataTransfer.effectAllowed = "move"
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={cn(
                        "cursor-grab rounded-md border bg-background p-3 shadow-sm active:cursor-grabbing",
                        overdue && "border-destructive/40 bg-destructive/5",
                        draggingId === task.id && "opacity-60"
                      )}
                    >
                      <Link href={`/tasks/${task.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                        {task.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        <span>{formatDue(task.dueDate)}</span>
                        <span>·</span>
                        <span>{TASK_PRIORITY_LABEL[task.priority]}</span>
                        {overdue ? <Badge variant="destructive">Просрочена</Badge> : null}
                      </div>
                      {task.assigneeName ? (
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{task.assigneeName}</p>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
