import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { createTaskFromMessage } from "@/lib/repositories/tasks.repository"
import {
  apiErrorSchema,
  taskDetailResponseSchema,
  taskFromMessageSchema,
} from "@/lib/validators/portal"

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const body = await request.json()
    const parsed = taskFromMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректные данные задачи", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }
    const created = await createTaskFromMessage({ ...parsed.data, creatorId: auth.userId })
    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:create-from-message",
      resourceType: "tasks",
      resourceId: created.id,
      statusCode: 201,
    })
    return NextResponse.json(taskDetailResponseSchema.parse({ item: { ...created, checklist: [], comments: [], participants: [] } }), {
      status: 201,
    })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось создать задачу" : (known.message ?? "Ошибка доступа"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
