import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { addTaskParticipant, removeTaskParticipant } from "@/lib/repositories/tasks.repository"
import {
  apiErrorSchema,
  taskDetailResponseSchema,
  taskParticipantPayloadSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const body = await request.json()
    const parsed = taskParticipantPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректные данные участника", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }
    const item = await addTaskParticipant(
      id,
      parsed.data.userId,
      parsed.data.role,
      auth.userId,
      auth.role
    )
    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:participant:add",
      resourceType: "task_participants",
      resourceId: id,
      statusCode: 200,
    })
    return NextResponse.json(taskDetailResponseSchema.parse({ item }))
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось добавить участника"
    const status = known.status ?? (message.includes("не найдена") ? 404 : message.includes("прав") ? 403 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code: status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const userId = request.nextUrl.searchParams.get("userId")
    const roleParam = request.nextUrl.searchParams.get("role")
    const parsed = taskParticipantPayloadSchema.safeParse({ userId, role: roleParam })
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректные параметры", code: "INVALID_QUERY" }),
        { status: 400 }
      )
    }
    const item = await removeTaskParticipant(
      id,
      parsed.data.userId,
      parsed.data.role,
      auth.userId,
      auth.role
    )
    return NextResponse.json(taskDetailResponseSchema.parse({ item }))
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось удалить участника"
    const status = known.status ?? (message.includes("не найдена") ? 404 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code: status === 404 ? "NOT_FOUND" : status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
