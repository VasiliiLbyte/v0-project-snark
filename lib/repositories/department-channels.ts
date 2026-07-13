import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { chatChannelMembers, chatChannels, departments, users } from "@/lib/db/schema"
import { isMockDb } from "@/lib/config/mode"

/**
 * Автосоздание/синхронизация канала отдела:
 * — один department-канал на отдел
 * — участники = активные users с departmentId
 */
export async function ensureDepartmentChannel(
  departmentId: string,
  departmentName: string,
  actorUserId?: string | null
): Promise<string | null> {
  if (isMockDb()) return null

  const [existing] = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(and(eq(chatChannels.type, "department"), eq(chatChannels.departmentId, departmentId)))
    .limit(1)

  let channelId = existing?.id ?? null

  if (!channelId) {
    try {
      const [created] = await db
        .insert(chatChannels)
        .values({
          name: departmentName,
          type: "department",
          departmentId,
          createdBy: actorUserId ?? null,
        })
        .returning({ id: chatChannels.id })
      channelId = created?.id ?? null
    } catch {
      const [again] = await db
        .select({ id: chatChannels.id })
        .from(chatChannels)
        .where(and(eq(chatChannels.type, "department"), eq(chatChannels.departmentId, departmentId)))
        .limit(1)
      channelId = again?.id ?? null
    }
  } else {
    await db
      .update(chatChannels)
      .set({ name: departmentName, updatedAt: new Date() })
      .where(eq(chatChannels.id, channelId))
  }

  if (!channelId) return null

  const memberRows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.departmentId, departmentId), eq(users.isActive, true)))

  const memberIds = memberRows.map((row) => row.id)
  if (memberIds.length === 0) return channelId

  await db
    .insert(chatChannelMembers)
    .values(
      memberIds.map((userId) => ({
        channelId,
        userId,
        lastReadAt: null as Date | null,
      }))
    )
    .onConflictDoNothing()

  const current = await db
    .select({ userId: chatChannelMembers.userId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.channelId, channelId))

  const keep = new Set(memberIds)
  const toRemove = current.map((row) => row.userId).filter((id) => !keep.has(id))
  if (toRemove.length > 0) {
    await db
      .delete(chatChannelMembers)
      .where(and(eq(chatChannelMembers.channelId, channelId), inArray(chatChannelMembers.userId, toRemove)))
  }

  return channelId
}

export async function syncAllDepartmentChannels(actorUserId?: string | null): Promise<{
  ensured: number
}> {
  if (isMockDb()) return { ensured: 0 }

  const rows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.isArchived, false))

  let ensured = 0
  for (const row of rows) {
    const id = await ensureDepartmentChannel(row.id, row.name, actorUserId)
    if (id) ensured++
  }
  return { ensured }
}
