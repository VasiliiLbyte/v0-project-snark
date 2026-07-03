import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import {
  deleteChecklistItem,
  updateChecklistItem,
} from "@/lib/repositories/tasks.repository"
import {
  apiErrorSchema,
  taskChecklistItemSchema,
  taskChecklistUpdateSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id, itemId } = await context.params
    const body = await request.json()
    const parsed = taskChecklistUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректные данные", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }
    const item = await updateChecklistItem(id, itemId, parsed.data, auth.userId, auth.role)
    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:checklist:update",
      resourceType: "task_checklist_items",
      resourceId: item.id,
      statusCode: 200,
    })
    return NextResponse.json({ item: taskChecklistItemSchema.parse(item) })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось обновить пункт"
    const status = known.status ?? (message.includes("не найден") ? 404 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code: status === 404 ? "NOT_FOUND" : status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id, itemId } = await context.params
    await deleteChecklistItem(id, itemId, auth.userId, auth.role)
    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:checklist:delete",
      resourceType: "task_checklist_items",
      resourceId: itemId,
      statusCode: 200,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось удалить пункт"
    const status = known.status ?? (message.includes("не найден") ? 404 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code: status === 404 ? "NOT_FOUND" : status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
