import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { addTaskComment, getTaskDetail } from "@/lib/repositories/tasks.repository"
import {
  apiErrorSchema,
  taskCommentCreateSchema,
  taskCommentSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const task = await getTaskDetail(id, auth.userId, auth.role)
    if (!task) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Задача не найдена", code: "NOT_FOUND" }),
        { status: 404 }
      )
    }
    return NextResponse.json({ items: task.comments })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось загрузить комментарии" : (known.message ?? "Ошибка доступа"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const body = await request.json()
    const parsed = taskCommentCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректный комментарий", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }
    const item = await addTaskComment(id, parsed.data, auth.userId, auth.role)
    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:comment:create",
      resourceType: "task_comments",
      resourceId: item.id,
      statusCode: 201,
    })
    return NextResponse.json({ item: taskCommentSchema.parse(item) }, { status: 201 })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось добавить комментарий"
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
