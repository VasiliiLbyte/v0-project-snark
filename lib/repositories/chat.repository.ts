import "server-only"
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/lib/db/client"
import { chatChannelMembers, chatChannels, chatMessages, employeeProfiles, users } from "@/lib/db/schema"
import { formatFullName } from "@/lib/portal-data/format-name"
import type {
  ChatChannel,
  ChatChannelCreatePayload,
  ChatChannelsListResponse,
  ChatMessage,
  ChatMessageType,
  ChatMessagesListResponse,
} from "@/types/portal"
import {
  mockAddChannelMembers,
  mockCreateChannel,
  mockFindOrCreateDirectChannel,
  mockGetMessageById,
  mockListChannelsForUser,
  mockListMessages,
  mockSendMessage,
} from "@/lib/repositories/chat.mock-store"

const author = alias(users, "message_author")
const replyMessage = alias(chatMessages, "reply_message")

function useMockDb(): boolean {
  return process.env.USE_MOCK_DB !== "false"
}

function mapMessage(row: {
  id: string
  channelId: string
  authorId: string
  authorFirstName: string
  authorLastName: string
  body: string
  messageType?: string | null
  replyToId?: string | null
  replyToBody?: string | null
  linkedTaskId?: string | null
  createdAt: Date
  editedAt: Date | null
}): ChatMessage {
  const metadataTaskId =
    row.linkedTaskId ??
    (typeof row.body === "string" && row.messageType === "system" ? undefined : undefined)

  return {
    id: row.id,
    channelId: row.channelId,
    authorId: row.authorId,
    authorName: formatFullName(row.authorLastName, row.authorFirstName),
    body: row.body,
    messageType: (row.messageType ?? "user") as ChatMessageType,
    replyToId: row.replyToId ?? null,
    replyToBody: row.replyToBody ?? null,
    linkedTaskId: metadataTaskId ?? null,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
  }
}

function parseLinkedTaskId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const taskId = (metadata as { taskId?: unknown }).taskId
  return typeof taskId === "string" ? taskId : null
}

export async function listMyChannels(userId: string): Promise<ChatChannelsListResponse> {
  if (useMockDb()) {
    return { items: mockListChannelsForUser(userId) }
  }

  const memberships = await db
    .select({ channelId: chatChannelMembers.channelId, lastReadAt: chatChannelMembers.lastReadAt })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.userId, userId))

  if (memberships.length === 0) {
    return { items: [] }
  }

  const channelIds = memberships.map((item) => item.channelId)
  const channels = await db
    .select()
    .from(chatChannels)
    .where(inArray(chatChannels.id, channelIds))
    .orderBy(desc(chatChannels.updatedAt))

  const items: ChatChannel[] = []
  for (const channel of channels) {
    const membership = memberships.find((item) => item.channelId === channel.id)
    const [lastMessageRow] = await db
      .select({
        id: chatMessages.id,
        channelId: chatMessages.channelId,
        authorId: chatMessages.authorId,
        authorFirstName: author.firstName,
        authorLastName: author.lastName,
        body: chatMessages.body,
        messageType: chatMessages.messageType,
        replyToId: chatMessages.replyToId,
        metadata: chatMessages.metadata,
        createdAt: chatMessages.createdAt,
        editedAt: chatMessages.editedAt,
      })
      .from(chatMessages)
      .innerJoin(author, eq(author.id, chatMessages.authorId))
      .where(eq(chatMessages.channelId, channel.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1)

    const [memberCountRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, channel.id))

    let unreadCount = 0
    const lastReadAt = membership?.lastReadAt
    const unreadConditions = [
      eq(chatMessages.channelId, channel.id),
      sql`${chatMessages.authorId} <> ${userId}`,
    ]
    if (lastReadAt) {
      unreadConditions.push(gt(chatMessages.createdAt, lastReadAt))
    }
    const [unreadRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(...unreadConditions))
    unreadCount = Number(unreadRow?.value ?? 0)

    let peerId: string | null = null
    let peerName: string | null = null
    if (channel.type === "direct") {
      const members = await db
        .select({
          userId: chatChannelMembers.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: employeeProfiles.middleName,
        })
        .from(chatChannelMembers)
        .innerJoin(users, eq(users.id, chatChannelMembers.userId))
        .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
        .where(eq(chatChannelMembers.channelId, channel.id))

      const peer = members.find((member) => member.userId !== userId)
      if (peer) {
        peerId = peer.userId
        peerName = formatFullName(peer.lastName, peer.firstName, peer.middleName)
      }
    }

    items.push({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      taskId: channel.taskId,
      departmentId: channel.departmentId,
      createdBy: channel.createdBy,
      memberCount: Number(memberCountRow?.value ?? 0),
      unreadCount,
      lastMessage: lastMessageRow
        ? mapMessage({
            ...lastMessageRow,
            linkedTaskId: parseLinkedTaskId(lastMessageRow.metadata),
          })
        : null,
      peerId,
      peerName,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    })
  }

  return { items }
}

export async function listChannelMessages(
  channelId: string,
  userId: string,
  limit = 50
): Promise<ChatMessagesListResponse> {
  if (useMockDb()) {
    return {
      channelId,
      items: mockListMessages(channelId, userId, limit),
    }
  }

  const [membership] = await db
    .select({ id: chatChannelMembers.id })
    .from(chatChannelMembers)
    .where(and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    throw new Error("Нет доступа к каналу")
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      authorId: chatMessages.authorId,
      authorFirstName: author.firstName,
      authorLastName: author.lastName,
      body: chatMessages.body,
      messageType: chatMessages.messageType,
      replyToId: chatMessages.replyToId,
      replyToBody: replyMessage.body,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      editedAt: chatMessages.editedAt,
    })
    .from(chatMessages)
    .innerJoin(author, eq(author.id, chatMessages.authorId))
    .leftJoin(replyMessage, eq(replyMessage.id, chatMessages.replyToId))
    .where(eq(chatMessages.channelId, channelId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)

  await db
    .update(chatChannelMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, userId)))

  return {
    channelId,
    items: rows.reverse().map((row) =>
      mapMessage({
        id: row.id,
        channelId: row.channelId,
        authorId: row.authorId,
        authorFirstName: row.authorFirstName,
        authorLastName: row.authorLastName,
        body: row.body,
        messageType: row.messageType,
        replyToId: row.replyToId,
        replyToBody: row.replyToBody,
        linkedTaskId: parseLinkedTaskId(row.metadata),
        createdAt: row.createdAt,
        editedAt: row.editedAt,
      })
    ),
  }
}

export async function createChannel(
  payload: ChatChannelCreatePayload & { createdBy: string }
): Promise<ChatChannel> {
  const uniqueMembers = Array.from(new Set([payload.createdBy, ...payload.memberIds]))

  if (useMockDb()) {
    return mockCreateChannel({
      name: payload.name ?? null,
      type: payload.type,
      departmentId: payload.departmentId ?? null,
      createdBy: payload.createdBy,
      memberIds: uniqueMembers.filter((id) => id !== payload.createdBy),
    })
  }

  const [channel] = await db
    .insert(chatChannels)
    .values({
      name: payload.name ?? null,
      type: payload.type,
      departmentId: payload.departmentId ?? null,
      createdBy: payload.createdBy,
    })
    .returning()

  await db.insert(chatChannelMembers).values(
    uniqueMembers.map((memberId) => ({
      channelId: channel.id,
      userId: memberId,
      lastReadAt: new Date(),
    }))
  )

  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    taskId: channel.taskId,
    departmentId: channel.departmentId,
    createdBy: channel.createdBy,
    memberCount: uniqueMembers.length,
    unreadCount: 0,
    lastMessage: null,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  }
}

export async function sendMessage(
  channelId: string,
  userId: string,
  body: string,
  options?: { replyToId?: string | null; messageType?: ChatMessageType }
): Promise<ChatMessage> {
  if (useMockDb()) {
    return mockSendMessage(channelId, userId, body, options)
  }

  const [membership] = await db
    .select({ id: chatChannelMembers.id })
    .from(chatChannelMembers)
    .where(and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    throw new Error("Нет доступа к каналу")
  }

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      channelId,
      authorId: userId,
      body,
      messageType: options?.messageType ?? "user",
      replyToId: options?.replyToId ?? null,
    })
    .returning({ id: chatMessages.id })

  await db
    .update(chatChannels)
    .set({ updatedAt: new Date() })
    .where(eq(chatChannels.id, channelId))

  await db
    .update(chatChannelMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, userId)))

  const [row] = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      authorId: chatMessages.authorId,
      authorFirstName: author.firstName,
      authorLastName: author.lastName,
      body: chatMessages.body,
      messageType: chatMessages.messageType,
      replyToId: chatMessages.replyToId,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      editedAt: chatMessages.editedAt,
    })
    .from(chatMessages)
    .innerJoin(author, eq(author.id, chatMessages.authorId))
    .where(eq(chatMessages.id, inserted.id))
    .limit(1)

  if (!row) throw new Error("Не удалось отправить сообщение")
  return mapMessage({
    ...row,
    linkedTaskId: parseLinkedTaskId(row.metadata),
  })
}

export async function getMessageById(messageId: string): Promise<ChatMessage | null> {
  if (useMockDb()) {
    return mockGetMessageById(messageId)
  }

  const [row] = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      authorId: chatMessages.authorId,
      authorFirstName: author.firstName,
      authorLastName: author.lastName,
      body: chatMessages.body,
      messageType: chatMessages.messageType,
      replyToId: chatMessages.replyToId,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      editedAt: chatMessages.editedAt,
    })
    .from(chatMessages)
    .innerJoin(author, eq(author.id, chatMessages.authorId))
    .where(eq(chatMessages.id, messageId))
    .limit(1)

  if (!row) return null
  return mapMessage({
    ...row,
    linkedTaskId: parseLinkedTaskId(row.metadata),
  })
}

export async function findOrCreateDirectChannel(
  userId: string,
  peerId: string
): Promise<ChatChannel> {
  if (useMockDb()) {
    return mockFindOrCreateDirectChannel(userId, peerId)
  }

  const myMemberships = await db
    .select({ channelId: chatChannelMembers.channelId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.userId, userId))

  for (const membership of myMemberships) {
    const [channel] = await db
      .select()
      .from(chatChannels)
      .where(and(eq(chatChannels.id, membership.channelId), eq(chatChannels.type, "direct")))
      .limit(1)
    if (!channel) continue

    const members = await db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, channel.id))

    const memberIds = members.map((item) => item.userId).sort()
    const expected = [userId, peerId].sort()
    if (memberIds.length === 2 && memberIds[0] === expected[0] && memberIds[1] === expected[1]) {
      const listed = await listMyChannels(userId)
      const found = listed.items.find((item) => item.id === channel.id)
      if (found) return found
    }
  }

  return createChannel({
    type: "direct",
    memberIds: [peerId],
    createdBy: userId,
  }).then(async (created) => {
    const listed = await listMyChannels(userId)
    return listed.items.find((item) => item.id === created.id) ?? created
  })
}

export async function addChannelMembers(
  channelId: string,
  actorUserId: string,
  memberIds: string[]
): Promise<ChatChannel> {
  const unique = Array.from(new Set(memberIds)).filter((id) => id !== actorUserId)
  if (unique.length === 0) {
    throw new Error("Укажите участников")
  }

  if (useMockDb()) {
    const channel = mockAddChannelMembers(channelId, actorUserId, unique)
    if (!channel) throw new Error("Нет доступа к каналу")
    return channel
  }

  const [membership] = await db
    .select({ id: chatChannelMembers.id })
    .from(chatChannelMembers)
    .where(and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, actorUserId)))
    .limit(1)

  if (!membership) throw new Error("Нет доступа к каналу")

  const [channelRow] = await db.select().from(chatChannels).where(eq(chatChannels.id, channelId)).limit(1)
  if (!channelRow) throw new Error("Канал не найден")
  if (channelRow.type === "direct") throw new Error("Нельзя добавить участников в личный чат")

  const existing = await db
    .select({ userId: chatChannelMembers.userId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.channelId, channelId))
  const existingIds = new Set(existing.map((row) => row.userId))
  const toAdd = unique.filter((id) => !existingIds.has(id))

  if (toAdd.length > 0) {
    await db.insert(chatChannelMembers).values(
      toAdd.map((userId) => ({
        channelId,
        userId,
        lastReadAt: new Date(),
      }))
    )
  }

  await db.update(chatChannels).set({ updatedAt: new Date() }).where(eq(chatChannels.id, channelId))

  const listed = await listMyChannels(actorUserId)
  const found = listed.items.find((item) => item.id === channelId)
  if (!found) throw new Error("Канал не найден")
  return found
}
