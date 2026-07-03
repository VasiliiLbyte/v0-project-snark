import { DEV_USERS } from "@/lib/auth/dev-users"
import type { ChatChannel, ChatMessage, ChatMessageType } from "@/types/portal"

interface MockChannelRecord {
  id: string
  name: string | null
  type: ChatChannel["type"]
  taskId: string | null
  departmentId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface MockMembership {
  channelId: string
  userId: string
  lastReadAt: string
}

const channels: MockChannelRecord[] = []
const messages: ChatMessage[] = []
const memberships: MockMembership[] = []
const directChannelKeys = new Map<string, string>()

function userName(userId: string): string {
  const dev = DEV_USERS.find((user) => user.id === userId)
  if (dev) return `${dev.lastName} ${dev.firstName}`.trim()
  return "Сотрудник"
}

function directKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(":")
}

function isMember(channelId: string, userId: string): boolean {
  return memberships.some((item) => item.channelId === channelId && item.userId === userId)
}

function memberIds(channelId: string): string[] {
  return memberships.filter((item) => item.channelId === channelId).map((item) => item.userId)
}

function enrichChannel(channel: MockChannelRecord, viewerId: string): ChatChannel {
  const channelMessages = messages.filter((message) => message.channelId === channel.id)
  const lastMessage = channelMessages.length > 0 ? channelMessages[channelMessages.length - 1] : null
  const members = memberIds(channel.id)

  let peerId: string | null = null
  let peerName: string | null = null
  if (channel.type === "direct") {
    peerId = members.find((id) => id !== viewerId) ?? null
    peerName = peerId ? userName(peerId) : null
  }

  const unreadCount = channelMessages.filter(
    (message) => message.authorId !== viewerId && message.messageType === "user"
  ).length

  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    taskId: channel.taskId,
    departmentId: channel.departmentId,
    createdBy: channel.createdBy,
    memberCount: members.length,
    unreadCount,
    lastMessage,
    peerId,
    peerName,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  }
}

function addMembers(channelId: string, userIds: string[]): void {
  const unique = Array.from(new Set(userIds))
  for (const userId of unique) {
    if (isMember(channelId, userId)) continue
    memberships.push({
      channelId,
      userId,
      lastReadAt: new Date().toISOString(),
    })
  }
}

export function mockListChannelsForUser(userId: string): ChatChannel[] {
  const channelIds = new Set(
    memberships.filter((item) => item.userId === userId).map((item) => item.channelId)
  )
  return channels
    .filter((channel) => channelIds.has(channel.id))
    .map((channel) => enrichChannel(channel, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function mockGetChannelByTaskId(taskId: string): string | null {
  return channels.find((channel) => channel.taskId === taskId)?.id ?? null
}

export function mockCreateChannel(params: {
  name: string | null
  type: ChatChannel["type"]
  taskId?: string | null
  departmentId?: string | null
  createdBy: string
  memberIds: string[]
}): ChatChannel {
  const now = new Date().toISOString()
  const channel: MockChannelRecord = {
    id: crypto.randomUUID(),
    name: params.name,
    type: params.type,
    taskId: params.taskId ?? null,
    departmentId: params.departmentId ?? null,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  channels.unshift(channel)
  addMembers(channel.id, [params.createdBy, ...params.memberIds])

  if (params.type === "direct") {
    const members = memberIds(channel.id)
    if (members.length === 2) {
      directChannelKeys.set(directKey(members[0], members[1]), channel.id)
    }
  }

  return enrichChannel(channel, params.createdBy)
}

export function mockFindOrCreateDirectChannel(userId: string, peerId: string): ChatChannel {
  const key = directKey(userId, peerId)
  const existingId = directChannelKeys.get(key)
  if (existingId) {
    const channel = channels.find((item) => item.id === existingId)
    if (channel) return enrichChannel(channel, userId)
  }

  return mockCreateChannel({
    type: "direct",
    name: null,
    createdBy: userId,
    memberIds: [peerId],
  })
}

export function mockEnsureTaskChannel(params: {
  taskId: string
  title: string
  creatorId: string
  assigneeId: string | null
  participantIds?: string[]
}): string {
  const existingId = mockGetChannelByTaskId(params.taskId)
  if (existingId) {
    const memberList = collectTaskMembers(params)
    addMembers(existingId, memberList)
    return existingId
  }

  const channel = mockCreateChannel({
    type: "task",
    name: params.title,
    taskId: params.taskId,
    createdBy: params.creatorId,
    memberIds: collectTaskMembers(params).filter((id) => id !== params.creatorId),
  })

  mockPostSystemMessage(channel.id, params.creatorId, `Создан чат задачи «${params.title}»`)
  return channel.id
}

function collectTaskMembers(params: {
  creatorId: string
  assigneeId: string | null
  participantIds?: string[]
}): string[] {
  const ids = new Set<string>([params.creatorId])
  if (params.assigneeId) ids.add(params.assigneeId)
  for (const id of params.participantIds ?? []) ids.add(id)
  return Array.from(ids)
}

export function mockAddChannelMembers(
  channelId: string,
  actorUserId: string,
  newMemberIds: string[]
): ChatChannel | null {
  const channel = channels.find((item) => item.id === channelId)
  if (!channel || !isMember(channelId, actorUserId)) return null
  if (channel.type === "direct") return null

  addMembers(channelId, newMemberIds)
  channel.updatedAt = new Date().toISOString()
  return enrichChannel(channel, actorUserId)
}

export function mockListMessages(channelId: string, userId: string, limit = 50): ChatMessage[] {
  if (!isMember(channelId, userId)) {
    throw new Error("Нет доступа к каналу")
  }
  return messages.filter((message) => message.channelId === channelId).slice(-limit)
}

export function mockSendMessage(
  channelId: string,
  userId: string,
  body: string,
  options?: { replyToId?: string | null; messageType?: ChatMessageType }
): ChatMessage {
  if (!isMember(channelId, userId)) {
    throw new Error("Нет доступа к каналу")
  }

  const channel = channels.find((item) => item.id === channelId)
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    channelId,
    authorId: userId,
    authorName: userId === userId ? "Вы" : userName(userId),
    body,
    messageType: options?.messageType ?? "user",
    replyToId: options?.replyToId ?? null,
    replyToBody: null,
    linkedTaskId: null,
    createdAt: new Date().toISOString(),
    editedAt: null,
  }
  message.authorName = "Вы"
  messages.push(message)
  if (channel) channel.updatedAt = message.createdAt
  return message
}

export function mockPostSystemMessage(
  channelId: string,
  actorId: string,
  body: string
): void {
  if (!isMember(channelId, actorId)) {
    addMembers(channelId, [actorId])
  }
  mockSendMessage(channelId, actorId, body, { messageType: "system" })
}

export function mockGetMessageById(messageId: string): ChatMessage | null {
  return messages.find((message) => message.id === messageId) ?? null
}

export function mockUserCanAccessChannel(channelId: string, userId: string): boolean {
  return isMember(channelId, userId)
}
