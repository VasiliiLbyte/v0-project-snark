import "server-only"
import { and, eq, isNotNull, lt, notInArray } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { taskReminders, tasks } from "@/lib/db/schema"
import { isMockDb } from "@/lib/config/mode"
import { createNotification } from "@/lib/repositories/notifications.repository"

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function alreadySent(taskId: string, userId: string, kind: string): Promise<boolean> {
  if (isMockDb()) return false
  const [row] = await db
    .select({ id: taskReminders.id })
    .from(taskReminders)
    .where(
      and(
        eq(taskReminders.taskId, taskId),
        eq(taskReminders.userId, userId),
        eq(taskReminders.kind, kind)
      )
    )
    .limit(1)
  return Boolean(row)
}

async function markSent(taskId: string, userId: string, kind: string): Promise<void> {
  if (isMockDb()) return
  await db
    .insert(taskReminders)
    .values({ taskId, userId, kind })
    .onConflictDoNothing({ target: [taskReminders.taskId, taskReminders.userId, taskReminders.kind] })
}

/** Часовой воркер: due_soon (за 1 день) и overdue. */
export async function runTaskReminderSweep(): Promise<{ dueSoon: number; overdue: number }> {
  if (isMockDb()) {
    return { dueSoon: 0, overdue: 0 }
  }

  const today = new Date()
  const todayStr = toDateOnly(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toDateOnly(tomorrow)

  let dueSoon = 0
  let overdue = 0

  const dueSoonTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, tomorrowStr),
        isNotNull(tasks.assigneeId),
        notInArray(tasks.status, ["done", "cancelled"])
      )
    )

  for (const task of dueSoonTasks) {
    if (!task.assigneeId) continue
    if (await alreadySent(task.id, task.assigneeId, "due_soon")) continue
    await createNotification({
      userId: task.assigneeId,
      type: "task_due_soon",
      title: `Завтра срок: «${task.title}»`,
      entityType: "task",
      entityId: task.id,
    })
    await markSent(task.id, task.assigneeId, "due_soon")
    dueSoon++
  }

  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(
      and(
        lt(tasks.dueDate, todayStr),
        isNotNull(tasks.assigneeId),
        notInArray(tasks.status, ["done", "cancelled"])
      )
    )

  for (const task of overdueTasks) {
    if (!task.assigneeId) continue
    if (await alreadySent(task.id, task.assigneeId, "overdue")) continue
    await createNotification({
      userId: task.assigneeId,
      type: "task_overdue",
      title: `Просрочена: «${task.title}»`,
      entityType: "task",
      entityId: task.id,
    })
    await markSent(task.id, task.assigneeId, "overdue")
    overdue++
  }

  return { dueSoon, overdue }
}

let workerStarted = false

export function startTaskReminderWorker(): void {
  if (workerStarted || isMockDb()) return
  workerStarted = true
  const HOUR = 60 * 60 * 1000
  void runTaskReminderSweep().catch(() => {})
  setInterval(() => {
    void runTaskReminderSweep().catch(() => {})
  }, HOUR)
}
