import "server-only"
import { and, asc, count, desc, eq, exists, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/lib/db/client"
import {
  chatChannels,
  departments,
  taskChecklistItems,
  taskAttachments,
  taskComments,
  taskLinks,
  taskParticipants,
  tasks,
  users,
} from "@/lib/db/schema"
import {
  ensureTaskChatChannel,
  getTaskChannelId,
  getTaskParticipantIds,
  linkTaskToMessage,
  notifyTaskCreatedFromMessage,
  notifyTaskStatusChange,
  syncTaskChatMembers,
  updateTaskChannelName,
  collectTaskMemberIds,
} from "@/lib/repositories/task-chat.integration"
import type {
  PortalTask,
  TaskAttachment,
  TaskChecklistCreatePayload,
  TaskChecklistItem,
  TaskChecklistUpdatePayload,
  TaskComment,
  TaskCommentCreatePayload,
  TaskCreatePayload,
  TaskDetail,
  TaskFromMessagePayload,
  TaskParticipantRole,
  TaskPriority,
  TasksListResponse,
  TasksQuery,
  TaskStatus,
  TaskUpdatePayload,
} from "@/types/portal"

const assignee = alias(users, "task_assignee")
const creator = alias(users, "task_creator")
const dept = alias(departments, "task_department")
const checklistAssignee = alias(users, "checklist_assignee")
const commentAuthor = alias(users, "comment_author")
const participantUser = alias(users, "participant_user")

const attachmentUploader = alias(users, "attachment_uploader")

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  assigneeId: string | null
  assigneeFirstName: string | null
  assigneeLastName: string | null
  creatorId: string
  creatorFirstName: string
  creatorLastName: string
  departmentId: string | null
  departmentName: string | null
  dueDate: string | null
  protocolActionItemId: number | null
  sourceMessageId: string | null
  sourceChannelId: string | null
  chatChannelId: string | null
  isImportant: boolean
  completionResult: string | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function mapTaskRow(row: TaskRow): PortalTask {
  const assigneeName =
    row.assigneeFirstName || row.assigneeLastName
      ? `${row.assigneeLastName ?? ""} ${row.assigneeFirstName ?? ""}`.trim()
      : null
  const creatorName = `${row.creatorLastName} ${row.creatorFirstName}`.trim()
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assigneeId: row.assigneeId,
    assigneeName,
    creatorId: row.creatorId,
    creatorName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    dueDate: row.dueDate,
    protocolActionItemId: row.protocolActionItemId,
    sourceMessageId: row.sourceMessageId,
    sourceChannelId: row.sourceChannelId,
    chatChannelId: row.chatChannelId,
    isImportant: row.isImportant,
    completionResult: row.completionResult,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const taskSelectFields = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  assigneeId: tasks.assigneeId,
  assigneeFirstName: assignee.firstName,
  assigneeLastName: assignee.lastName,
  creatorId: tasks.creatorId,
  creatorFirstName: creator.firstName,
  creatorLastName: creator.lastName,
  departmentId: tasks.departmentId,
  departmentName: dept.name,
  dueDate: tasks.dueDate,
  protocolActionItemId: tasks.protocolActionItemId,
  sourceMessageId: tasks.sourceMessageId,
  sourceChannelId: tasks.sourceChannelId,
  chatChannelId: chatChannels.id,
  isImportant: tasks.isImportant,
  completionResult: tasks.completionResult,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
}

async function selectTaskRow(id: string): Promise<TaskRow | null> {
  const [row] = await db
    .select(taskSelectFields)
    .from(tasks)
    .innerJoin(creator, eq(creator.id, tasks.creatorId))
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(dept, eq(dept.id, tasks.departmentId))
    .leftJoin(chatChannels, eq(chatChannels.taskId, tasks.id))
    .where(eq(tasks.id, id))
    .limit(1)
  return row ?? null
}

const mockTasks: PortalTask[] = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    title: "Подготовить отчёт по проекту",
    description: "Собрать метрики за квартал",
    status: "in_progress",
    priority: "high",
    assigneeId: null,
    assigneeName: null,
    creatorId: "00000000-0000-0000-0000-000000000001",
    creatorName: "Администратор",
    departmentId: null,
    departmentName: null,
    dueDate: "2026-06-20",
    protocolActionItemId: null,
    sourceMessageId: null,
    sourceChannelId: null,
    chatChannelId: null,
    isImportant: false,
    completionResult: null,
    completedAt: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-10T12:00:00.000Z",
  },
]

const mockChecklist: TaskChecklistItem[] = []
const mockComments: TaskComment[] = []

const mockAttachments: TaskAttachment[] = []

function useMockDb(): boolean {
  return process.env.USE_MOCK_DB !== "false"
}

async function isTaskParticipant(taskId: string, userId: string): Promise<boolean> {
  if (useMockDb()) return false
  const [row] = await db
    .select({ id: taskParticipants.id })
    .from(taskParticipants)
    .where(and(eq(taskParticipants.taskId, taskId), eq(taskParticipants.userId, userId)))
    .limit(1)
  return Boolean(row)
}

async function canAccessTask(task: PortalTask, userId: string, role?: string): Promise<boolean> {
  if (role === "admin" || role === "hr_manager") return true
  if (task.assigneeId === userId || task.creatorId === userId) return true
  return isTaskParticipant(task.id, userId)
}

export async function listTasks(
  userId: string,
  query?: TasksQuery,
  role?: string
): Promise<TasksListResponse> {
  if (useMockDb()) {
    const page = query?.page ?? 1
    const limit = query?.limit ?? 20
    let filtered = mockTasks.filter(
      (task) =>
        role === "admin" ||
        role === "hr_manager" ||
        task.assigneeId === userId ||
        task.creatorId === userId
    )
    if (query?.status && query.status !== "all") {
      filtered = filtered.filter((task) => task.status === query.status)
    }
    const start = (page - 1) * limit
    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    }
  }

  const page = query?.page ?? 1
  const limit = query?.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = []
  if (role !== "admin" && role !== "hr_manager") {
    conditions.push(
      or(
        eq(tasks.assigneeId, userId),
        eq(tasks.creatorId, userId),
        exists(
          db
            .select({ id: taskParticipants.id })
            .from(taskParticipants)
            .where(and(eq(taskParticipants.taskId, tasks.id), eq(taskParticipants.userId, userId)))
        )
      )
    )
  }
  if (query?.status && query.status !== "all") {
    conditions.push(eq(tasks.status, query.status))
  }
  if (query?.assigneeId) {
    conditions.push(eq(tasks.assigneeId, query.assigneeId))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [totalRow] = await db.select({ value: count() }).from(tasks).where(where)
  const rows = await db
    .select(taskSelectFields)
    .from(tasks)
    .innerJoin(creator, eq(creator.id, tasks.creatorId))
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(dept, eq(dept.id, tasks.departmentId))
    .leftJoin(chatChannels, eq(chatChannels.taskId, tasks.id))
    .where(where)
    .orderBy(desc(tasks.updatedAt))
    .limit(limit)
    .offset(offset)

  return {
    items: rows.map(mapTaskRow),
    total: Number(totalRow?.value ?? 0),
    page,
    limit,
  }
}

async function loadChecklist(taskId: string): Promise<TaskChecklistItem[]> {
  const rows = await db
    .select({
      id: taskChecklistItems.id,
      taskId: taskChecklistItems.taskId,
      title: taskChecklistItems.title,
      isDone: taskChecklistItems.isDone,
      assigneeId: taskChecklistItems.assigneeId,
      assigneeFirstName: checklistAssignee.firstName,
      assigneeLastName: checklistAssignee.lastName,
      sortOrder: taskChecklistItems.sortOrder,
      completedAt: taskChecklistItems.completedAt,
      createdAt: taskChecklistItems.createdAt,
    })
    .from(taskChecklistItems)
    .leftJoin(checklistAssignee, eq(checklistAssignee.id, taskChecklistItems.assigneeId))
    .where(eq(taskChecklistItems.taskId, taskId))
    .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.createdAt))

  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    isDone: row.isDone,
    assigneeId: row.assigneeId,
    assigneeName:
      row.assigneeFirstName || row.assigneeLastName
        ? `${row.assigneeLastName ?? ""} ${row.assigneeFirstName ?? ""}`.trim()
        : null,
    sortOrder: row.sortOrder,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }))
}

async function loadComments(taskId: string): Promise<TaskComment[]> {
  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      authorId: taskComments.authorId,
      authorFirstName: commentAuthor.firstName,
      authorLastName: commentAuthor.lastName,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
    })
    .from(taskComments)
    .innerJoin(commentAuthor, eq(commentAuthor.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))

  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    authorId: row.authorId,
    authorName: `${row.authorLastName} ${row.authorFirstName}`.trim(),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }))
}

async function loadAttachments(taskId: string): Promise<TaskAttachment[]> {
  const rows = await db
    .select({
      id: taskAttachments.id,
      taskId: taskAttachments.taskId,
      fileName: taskAttachments.fileName,
      fileUrl: taskAttachments.fileUrl,
      mimeType: taskAttachments.mimeType,
      sizeBytes: taskAttachments.sizeBytes,
      attachmentType: taskAttachments.attachmentType,
      uploadedBy: taskAttachments.uploadedBy,
      uploaderFirstName: attachmentUploader.firstName,
      uploaderLastName: attachmentUploader.lastName,
      createdAt: taskAttachments.createdAt,
    })
    .from(taskAttachments)
    .leftJoin(attachmentUploader, eq(attachmentUploader.id, taskAttachments.uploadedBy))
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.createdAt))

  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    attachmentType: row.attachmentType as "general" | "completion",
    uploadedBy: row.uploadedBy,
    uploaderName:
      row.uploaderFirstName || row.uploaderLastName
        ? `${row.uploaderLastName ?? ""} ${row.uploaderFirstName ?? ""}`.trim()
        : null,
    createdAt: row.createdAt.toISOString(),
  }))
}

async function loadParticipants(taskId: string) {
  const rows = await db
    .select({
      id: taskParticipants.id,
      taskId: taskParticipants.taskId,
      userId: taskParticipants.userId,
      role: taskParticipants.role,
      firstName: participantUser.firstName,
      lastName: participantUser.lastName,
      createdAt: taskParticipants.createdAt,
    })
    .from(taskParticipants)
    .innerJoin(participantUser, eq(participantUser.id, taskParticipants.userId))
    .where(eq(taskParticipants.taskId, taskId))

  return rows.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    userName: `${row.lastName} ${row.firstName}`.trim(),
    role: row.role as "co_assignee" | "watcher",
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function getTaskById(
  id: string,
  userId: string,
  role?: string
): Promise<PortalTask | null> {
  const detail = await getTaskDetail(id, userId, role)
  return detail
}

export async function getTaskDetail(
  id: string,
  userId: string,
  role?: string
): Promise<TaskDetail | null> {
  if (useMockDb()) {
    const task = mockTasks.find((item) => item.id === id)
    if (!task) return null
    const allowed =
      role === "admin" ||
      role === "hr_manager" ||
      task.assigneeId === userId ||
      task.creatorId === userId
    if (!allowed) return null
    return {
      ...task,
      checklist: mockChecklist.filter((item) => item.taskId === id),
      comments: mockComments.filter((item) => item.taskId === id),
      participants: [],
      attachments: mockAttachments.filter((item) => item.taskId === id),
    }
  }

  const row = await selectTaskRow(id)
  if (!row) return null
  const task = mapTaskRow(row)
  if (!(await canAccessTask(task, userId, role))) return null

  const [checklist, comments, participants, attachments] = await Promise.all([
    loadChecklist(id),
    loadComments(id),
    loadParticipants(id),
    loadAttachments(id),
  ])

  return { ...task, checklist, comments, participants, attachments }
}

async function saveWatchers(taskId: string, watcherIds: string[]): Promise<void> {
  if (watcherIds.length === 0) return
  await db
    .insert(taskParticipants)
    .values(
      watcherIds.map((userId) => ({
        taskId,
        userId,
        role: "watcher" as const,
      }))
    )
    .onConflictDoNothing({
      target: [taskParticipants.taskId, taskParticipants.userId, taskParticipants.role],
    })
}

export async function createTask(
  payload: TaskCreatePayload & { creatorId: string }
): Promise<PortalTask> {
  if (useMockDb()) {
    const task: PortalTask = {
      id: crypto.randomUUID(),
      title: payload.title,
      description: payload.description ?? null,
      status: "new",
      priority: payload.priority ?? "medium",
      assigneeId: payload.assigneeId ?? null,
      assigneeName: null,
      creatorId: payload.creatorId,
      creatorName: "Вы",
      departmentId: payload.departmentId ?? null,
      departmentName: null,
      dueDate: payload.dueDate ?? null,
      protocolActionItemId: null,
      sourceMessageId: payload.sourceMessageId ?? null,
      sourceChannelId: payload.sourceChannelId ?? null,
      chatChannelId: null,
      isImportant: false,
      completionResult: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockTasks.unshift(task)
    const channelId = await ensureTaskChatChannel(task, payload.watcherIds ?? [])
    if (channelId) {
      const index = mockTasks.findIndex((item) => item.id === task.id)
      if (index >= 0) mockTasks[index] = { ...mockTasks[index], chatChannelId: channelId }
      return { ...mockTasks[index] }
    }
    return task
  }

  const [created] = await db
    .insert(tasks)
    .values({
      title: payload.title,
      description: payload.description ?? null,
      priority: payload.priority ?? "medium",
      assigneeId: payload.assigneeId ?? null,
      creatorId: payload.creatorId,
      departmentId: payload.departmentId ?? null,
      dueDate: payload.dueDate ?? null,
      sourceMessageId: payload.sourceMessageId ?? null,
      sourceChannelId: payload.sourceChannelId ?? null,
      status: "new",
    })
    .returning({ id: tasks.id })

  if (payload.watcherIds?.length) {
    await saveWatchers(created.id, payload.watcherIds)
  }

  if (payload.sourceMessageId) {
    await linkTaskToMessage(created.id, payload.sourceMessageId)
  }

  const row = await selectTaskRow(created.id)
  if (!row) throw new Error("Не удалось создать задачу")
  const task = mapTaskRow(row)

  const participantIds = await getTaskParticipantIds(task.id)
  const channelId = await ensureTaskChatChannel(task, participantIds)
  if (channelId) {
    task.chatChannelId = channelId
  }

  if (payload.sourceChannelId && payload.sourceMessageId) {
    await notifyTaskCreatedFromMessage(payload.sourceChannelId, payload.creatorId, task)
  }

  return task
}

export async function createTaskFromMessage(
  payload: TaskFromMessagePayload & { creatorId: string }
): Promise<PortalTask> {
  return createTask({
    title: payload.title,
    description: payload.description,
    assigneeId: payload.assigneeId,
    priority: payload.priority,
    dueDate: payload.dueDate,
    sourceMessageId: payload.sourceMessageId,
    sourceChannelId: payload.sourceChannelId,
    creatorId: payload.creatorId,
  })
}

export async function updateTask(
  id: string,
  payload: TaskUpdatePayload,
  userId: string,
  role?: string
): Promise<TaskDetail> {
  const existing = await getTaskDetail(id, userId, role)
  if (!existing) throw new Error("Задача не найдена")
  const previousStatus = existing.status

  if (useMockDb()) {
    const index = mockTasks.findIndex((item) => item.id === id)
    if (index < 0) throw new Error("Задача не найдена")
    const next: PortalTask = {
      ...mockTasks[index],
      ...payload,
      title: payload.title ?? mockTasks[index].title,
      status: payload.status ?? mockTasks[index].status,
      priority: payload.priority ?? mockTasks[index].priority,
      updatedAt: new Date().toISOString(),
      completedAt:
        payload.status === "done"
          ? new Date().toISOString()
          : payload.status !== undefined
            ? null
            : mockTasks[index].completedAt,
    }
    mockTasks[index] = next
    const detail = await getTaskDetail(id, userId, role)
    if (!detail) throw new Error("Задача не найдена")
    return detail
  }

  const updateSet: Record<string, unknown> = { updatedAt: new Date() }
  if (payload.title !== undefined) updateSet.title = payload.title
  if (payload.description !== undefined) updateSet.description = payload.description
  if (payload.status !== undefined) {
    updateSet.status = payload.status
    updateSet.completedAt = payload.status === "done" ? new Date() : null
  }
  if (payload.priority !== undefined) updateSet.priority = payload.priority
  if (payload.assigneeId !== undefined) updateSet.assigneeId = payload.assigneeId
  if (payload.departmentId !== undefined) updateSet.departmentId = payload.departmentId
  if (payload.dueDate !== undefined) updateSet.dueDate = payload.dueDate
  if (payload.isImportant !== undefined) updateSet.isImportant = payload.isImportant
  if (payload.completionResult !== undefined) updateSet.completionResult = payload.completionResult

  await db.update(tasks).set(updateSet).where(eq(tasks.id, id))

  if (payload.title !== undefined) {
    await updateTaskChannelName(id, payload.title)
  }

  const row = await selectTaskRow(id)
  if (!row) throw new Error("Задача не найдена")
  const task = mapTaskRow(row)

  const participantIds = await getTaskParticipantIds(id)
  await syncTaskChatMembers(
    id,
    collectTaskMemberIds({
      creatorId: task.creatorId,
      assigneeId: task.assigneeId,
      participantIds,
    })
  )

  if (payload.status !== undefined) {
    await notifyTaskStatusChange(task, userId, previousStatus, payload.status)
  }

  const detail = await getTaskDetail(id, userId, role)
  if (!detail) throw new Error("Задача не найдена")
  return detail
}

export async function addChecklistItem(
  taskId: string,
  payload: TaskChecklistCreatePayload,
  userId: string,
  role?: string
): Promise<TaskChecklistItem> {
  const task = await getTaskById(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    const item: TaskChecklistItem = {
      id: crypto.randomUUID(),
      taskId,
      title: payload.title,
      isDone: false,
      assigneeId: payload.assigneeId ?? null,
      assigneeName: null,
      sortOrder: mockChecklist.filter((i) => i.taskId === taskId).length,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    mockChecklist.push(item)
    return item
  }

  const [countRow] = await db
    .select({ value: count() })
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))

  const [created] = await db
    .insert(taskChecklistItems)
    .values({
      taskId,
      title: payload.title,
      assigneeId: payload.assigneeId ?? null,
      sortOrder: Number(countRow?.value ?? 0),
    })
    .returning({ id: taskChecklistItems.id })

  const items = await loadChecklist(taskId)
  const item = items.find((entry) => entry.id === created.id)
  if (!item) throw new Error("Не удалось добавить пункт чек-листа")
  return item
}

export async function updateChecklistItem(
  taskId: string,
  itemId: string,
  payload: TaskChecklistUpdatePayload,
  userId: string,
  role?: string
): Promise<TaskChecklistItem> {
  const task = await getTaskById(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    const index = mockChecklist.findIndex((item) => item.id === itemId && item.taskId === taskId)
    if (index < 0) throw new Error("Пункт не найден")
    mockChecklist[index] = {
      ...mockChecklist[index],
      title: payload.title ?? mockChecklist[index].title,
      isDone: payload.isDone ?? mockChecklist[index].isDone,
      assigneeId: payload.assigneeId ?? mockChecklist[index].assigneeId,
      completedAt:
        payload.isDone === true
          ? new Date().toISOString()
          : payload.isDone === false
            ? null
            : mockChecklist[index].completedAt,
    }
    return mockChecklist[index]
  }

  const updateSet: Record<string, unknown> = {}
  if (payload.title !== undefined) updateSet.title = payload.title
  if (payload.assigneeId !== undefined) updateSet.assigneeId = payload.assigneeId
  if (payload.isDone !== undefined) {
    updateSet.isDone = payload.isDone
    updateSet.completedAt = payload.isDone ? new Date() : null
  }

  await db
    .update(taskChecklistItems)
    .set(updateSet)
    .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.taskId, taskId)))

  const items = await loadChecklist(taskId)
  const item = items.find((entry) => entry.id === itemId)
  if (!item) throw new Error("Пункт не найден")
  return item
}

export async function deleteChecklistItem(
  taskId: string,
  itemId: string,
  userId: string,
  role?: string
): Promise<void> {
  const task = await getTaskById(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    const index = mockChecklist.findIndex((item) => item.id === itemId)
    if (index >= 0) mockChecklist.splice(index, 1)
    return
  }

  await db
    .delete(taskChecklistItems)
    .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.taskId, taskId)))
}

export async function addTaskComment(
  taskId: string,
  payload: TaskCommentCreatePayload,
  userId: string,
  role?: string
): Promise<TaskComment> {
  const task = await getTaskById(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    const comment: TaskComment = {
      id: crypto.randomUUID(),
      taskId,
      authorId: userId,
      authorName: "Вы",
      body: payload.body,
      createdAt: new Date().toISOString(),
    }
    mockComments.push(comment)
    return comment
  }

  const [created] = await db
    .insert(taskComments)
    .values({ taskId, authorId: userId, body: payload.body })
    .returning({ id: taskComments.id })

  const comments = await loadComments(taskId)
  const comment = comments.find((entry) => entry.id === created.id)
  if (!comment) throw new Error("Не удалось добавить комментарий")
  return comment
}

export async function getTaskChatChannelId(
  taskId: string,
  userId: string,
  role?: string
): Promise<string | null> {
  const task = await getTaskById(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (task.chatChannelId) return task.chatChannelId

  const channelId = await getTaskChannelId(taskId)
  if (channelId) return channelId

  const participantIds = await getTaskParticipantIds(taskId)
  const fullTask = await getTaskById(taskId, userId, role)
  if (!fullTask) throw new Error("Задача не найдена")
  const createdChannelId = await ensureTaskChatChannel(fullTask, participantIds)
  if (useMockDb() && createdChannelId) {
    const index = mockTasks.findIndex((item) => item.id === taskId)
    if (index >= 0) mockTasks[index] = { ...mockTasks[index], chatChannelId: createdChannelId }
  }
  return createdChannelId
}

export async function deleteTask(id: string, userId: string, role?: string): Promise<void> {
  const task = await getTaskDetail(id, userId, role)
  if (!task) throw new Error("Задача не найдена")
  const canDelete =
    role === "admin" || role === "hr_manager" || task.creatorId === userId
  if (!canDelete) throw new Error("Нет прав на удаление задачи")

  if (useMockDb()) {
    const index = mockTasks.findIndex((item) => item.id === id)
    if (index >= 0) mockTasks.splice(index, 1)
    return
  }

  await db.delete(tasks).where(eq(tasks.id, id))
}

export async function completeTask(
  id: string,
  completionResult: string,
  userId: string,
  role?: string
): Promise<TaskDetail> {
  return updateTask(
    id,
    { status: "done", completionResult },
    userId,
    role
  )
}

export async function addTaskParticipant(
  taskId: string,
  participantUserId: string,
  participantRole: TaskParticipantRole,
  userId: string,
  role?: string
): Promise<TaskDetail> {
  const task = await getTaskDetail(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")
  const canEdit =
    role === "admin" ||
    role === "hr_manager" ||
    task.creatorId === userId ||
    task.assigneeId === userId
  if (!canEdit) throw new Error("Нет прав на изменение участников")

  if (useMockDb()) {
    return task
  }

  await db
    .insert(taskParticipants)
    .values({ taskId, userId: participantUserId, role: participantRole })
    .onConflictDoNothing({
      target: [taskParticipants.taskId, taskParticipants.userId, taskParticipants.role],
    })

  const updated = await getTaskDetail(taskId, userId, role)
  if (!updated) throw new Error("Задача не найдена")

  await syncTaskChatMembers(
    taskId,
    collectTaskMemberIds({
      creatorId: updated.creatorId,
      assigneeId: updated.assigneeId,
      participantIds: updated.participants.map((p) => p.userId),
    })
  )

  return updated
}

export async function removeTaskParticipant(
  taskId: string,
  participantUserId: string,
  participantRole: TaskParticipantRole,
  userId: string,
  role?: string
): Promise<TaskDetail> {
  const task = await getTaskDetail(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    return task
  }

  await db
    .delete(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, participantUserId),
        eq(taskParticipants.role, participantRole)
      )
    )

  const updated = await getTaskDetail(taskId, userId, role)
  if (!updated) throw new Error("Задача не найдена")
  return updated
}

export async function createTaskAttachmentRecord(
  taskId: string,
  data: {
    fileName: string
    fileUrl: string
    mimeType: string
    sizeBytes: number
    attachmentType?: "general" | "completion"
    uploadedBy: string
  },
  userId: string,
  role?: string
): Promise<TaskAttachment> {
  const task = await getTaskDetail(taskId, userId, role)
  if (!task) throw new Error("Задача не найдена")

  if (useMockDb()) {
    const attachment: TaskAttachment = {
      id: crypto.randomUUID(),
      taskId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      attachmentType: data.attachmentType ?? "general",
      uploadedBy: data.uploadedBy,
      uploaderName: "Вы",
      createdAt: new Date().toISOString(),
    }
    mockAttachments.push(attachment)
    return attachment
  }

  const [created] = await db
    .insert(taskAttachments)
    .values({
      taskId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      attachmentType: data.attachmentType ?? "general",
      uploadedBy: data.uploadedBy,
    })
    .returning({ id: taskAttachments.id })

  const attachments = await loadAttachments(taskId)
  const attachment = attachments.find((item) => item.id === created.id)
  if (!attachment) throw new Error("Не удалось сохранить вложение")
  return attachment
}

export async function listMyDashboardTasks(userId: string): Promise<
  Array<{ title: string; deadline: string; priority: "high" | "medium" | "low" }>
> {
  const data = await listTasks(userId, { status: "all", limit: 5, page: 1 })
  return data.items
    .filter((task) => task.status !== "done" && task.status !== "cancelled")
    .map((task) => ({
      title: task.title,
      deadline: task.dueDate ?? "—",
      priority: task.priority === "critical" ? "high" : task.priority,
    }))
}
