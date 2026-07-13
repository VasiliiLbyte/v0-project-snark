import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db/client"
import {
  chatChannelMembers,
  chatChannels,
  chatMessages,
  taskLinks,
  taskParticipants,
  tasks,
} from "@/lib/db/schema"
import { TASK_STATUS_LABEL } from "@/lib/portal-data/tasks-ui"
import {
  mockEnsureTaskChannel,
  mockGetChannelByTaskId,
  mockPostSystemMessage,
} from "@/lib/repositories/chat.mock-store"
import { isMockDb } from "@/lib/config/mode"
import type { PortalTask, TaskStatus } from "@/types/portal"

export function collectTaskMemberIds(task: {
  creatorId: string
  assigneeId: string | null
  participantIds?: string[]
}): string[] {
  const ids = new Set<string>([task.creatorId])
  if (task.assigneeId) ids.add(task.assigneeId)
  for (const id of task.participantIds ?? []) ids.add(id)
  return Array.from(ids)
}

export async function getTaskParticipantIds(taskId: string): Promise<string[]> {
  if (isMockDb()) return []

  const rows = await db
    .select({ userId: taskParticipants.userId })
    .from(taskParticipants)
    .where(eq(taskParticipants.taskId, taskId))

  return rows.map((row) => row.userId)
}

export async function getTaskChannelId(taskId: string): Promise<string | null> {
  if (isMockDb()) return mockGetChannelByTaskId(taskId)

  const [row] = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(eq(chatChannels.taskId, taskId))
    .limit(1)

  return row?.id ?? null
}

export async function ensureTaskChatChannel(
  task: PortalTask,
  participantIds: string[] = []
): Promise<string | null> {
  if (isMockDb()) {
    return mockEnsureTaskChannel({
      taskId: task.id,
      title: task.title,
      creatorId: task.creatorId,
      assigneeId: task.assigneeId,
      participantIds,
    })
  }

  const memberIds = collectTaskMemberIds({
    creatorId: task.creatorId,
    assigneeId: task.assigneeId,
    participantIds,
  })

  const existingId = await getTaskChannelId(task.id)
  if (existingId) {
    await syncTaskChatMembers(task.id, memberIds)
    return existingId
  }

  const [channel] = await db
    .insert(chatChannels)
    .values({
      name: task.title,
      type: "task",
      taskId: task.id,
      createdBy: task.creatorId,
    })
    .returning({ id: chatChannels.id })

  await db.insert(chatChannelMembers).values(
    memberIds.map((userId) => ({
      channelId: channel.id,
      userId,
      lastReadAt: new Date(),
    }))
  )

  await postTaskSystemMessage(
    channel.id,
    task.creatorId,
    `Создан чат задачи «${task.title}»`
  )

  return channel.id
}

export async function syncTaskChatMembers(taskId: string, memberIds: string[]): Promise<void> {
  if (isMockDb()) return

  const channelId = await getTaskChannelId(taskId)
  if (!channelId) return

  const unique = Array.from(new Set(memberIds))
  const existing = await db
    .select({ userId: chatChannelMembers.userId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.channelId, channelId))

  const existingIds = new Set(existing.map((row) => row.userId))
  const toAdd = unique.filter((id) => !existingIds.has(id))
  const toRemove = [...existingIds].filter((id) => !unique.includes(id))

  if (toAdd.length > 0) {
    await db.insert(chatChannelMembers).values(
      toAdd.map((userId) => ({
        channelId,
        userId,
        lastReadAt: new Date(),
      }))
    )
  }

  if (toRemove.length > 0) {
    await db
      .delete(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          inArray(chatChannelMembers.userId, toRemove)
        )
      )
  }
}

export async function postTaskSystemMessage(
  channelId: string,
  actorId: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (isMockDb()) {
    mockPostSystemMessage(channelId, actorId, body)
    return
  }

  await db.insert(chatMessages).values({
    channelId,
    authorId: actorId,
    body,
    messageType: "system",
    metadata: metadata ?? null,
  })

  await db
    .update(chatChannels)
    .set({ updatedAt: new Date() })
    .where(eq(chatChannels.id, channelId))
}

export async function notifyTaskStatusChange(
  task: PortalTask,
  actorId: string,
  previousStatus: TaskStatus,
  nextStatus: TaskStatus
): Promise<void> {
  if (previousStatus === nextStatus) return

  const channelId = await getTaskChannelId(task.id)
  if (!channelId) return

  const label = TASK_STATUS_LABEL[nextStatus]
  await postTaskSystemMessage(
    channelId,
    actorId,
    `Статус изменён: ${TASK_STATUS_LABEL[previousStatus]} → ${label}`,
    { taskId: task.id, status: nextStatus }
  )
}

export async function notifyTaskCreatedFromMessage(
  channelId: string,
  actorId: string,
  task: PortalTask
): Promise<void> {
  await postTaskSystemMessage(
    channelId,
    actorId,
    `📋 Создана задача «${task.title}»`,
    { taskId: task.id, link: `/tasks/${task.id}` }
  )
}

export async function linkTaskToMessage(taskId: string, messageId: string): Promise<void> {
  if (isMockDb()) return

  await db.insert(taskLinks).values({
    taskId,
    entityType: "chat_message",
    entityId: messageId,
  })
}

export async function updateTaskChannelName(taskId: string, title: string): Promise<void> {
  if (isMockDb()) return

  await db
    .update(chatChannels)
    .set({ name: title, updatedAt: new Date() })
    .where(eq(chatChannels.taskId, taskId))
}

export async function loadTaskChannelMeta(taskId: string): Promise<{
  channelId: string | null
  taskTitle: string | null
}> {
  if (isMockDb()) return { channelId: null, taskTitle: null }

  const [row] = await db
    .select({ channelId: chatChannels.id, taskTitle: tasks.title })
    .from(chatChannels)
    .innerJoin(tasks, eq(tasks.id, chatChannels.taskId))
    .where(eq(chatChannels.taskId, taskId))
    .limit(1)

  return {
    channelId: row?.channelId ?? null,
    taskTitle: row?.taskTitle ?? null,
  }
}
