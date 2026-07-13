import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { deleteMessage, updateMessage } from "@/lib/repositories/chat.repository"
import { apiErrorSchema, chatMessageSchema } from "@/lib/validators/portal"
import { z } from "zod"

const updateSchema = z.object({
  body: z.string().trim().min(1).max(10000),
})

interface RouteContext {
  params: Promise<{ id: string; msgId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id, msgId } = await context.params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректное сообщение", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    const item = await updateMessage(id, msgId, auth.userId, parsed.data.body, auth.role)
    await writeAuditLog({
      userId: auth.userId,
      action: "user:chat:edit-message",
      resourceType: "chat_messages",
      resourceId: item.id,
      statusCode: 200,
    })
    return NextResponse.json({ item: chatMessageSchema.parse(item) })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось изменить сообщение"
    const status =
      known.status ??
      (message.includes("доступ") || message.includes("только")
        ? 403
        : message.includes("15 минут")
          ? 403
          : message.includes("найдено")
            ? 404
            : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: message,
        code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
      }),
      { status }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id, msgId } = await context.params
    await deleteMessage(id, msgId, auth.userId, auth.role)
    await writeAuditLog({
      userId: auth.userId,
      action: "user:chat:delete-message",
      resourceType: "chat_messages",
      resourceId: msgId,
      statusCode: 200,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось удалить сообщение"
    const status =
      known.status ??
      (message.includes("доступ") || message.includes("только") || message.includes("15 минут")
        ? 403
        : message.includes("найдено")
          ? 404
          : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: message,
        code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
      }),
      { status }
    )
  }
}
