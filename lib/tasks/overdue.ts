import type { PortalTask, TaskStatus } from "@/types/portal"

/** dueDate < today && status ∉ {done, cancelled} */
export function isTaskOverdue(
  task: Pick<PortalTask, "dueDate" | "status"> | { dueDate: string | null; status: TaskStatus | string }
): boolean {
  if (!task.dueDate) return false
  if (task.status === "done" || task.status === "cancelled") return false
  const due = new Date(task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}
