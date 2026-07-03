import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import {
  completeTask,
  createTaskAttachmentRecord,
  getTaskDetail,
} from "@/lib/repositories/tasks.repository"
import { saveTaskFile } from "@/lib/storage/save-task-file"
import { apiErrorSchema, taskCompleteSchema, taskDetailResponseSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const formData = await request.formData()
    const completionResult = String(formData.get("completionResult") ?? "").trim()
    const parsed = taskCompleteSchema.safeParse({ completionResult })
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Укажите результат выполнения", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    await completeTask(id, parsed.data.completionResult, auth.userId, auth.role)

    const file = formData.get("file")
    if (file instanceof File && file.size > 0) {
      const saved = await saveTaskFile(id, file, "result-")
      await createTaskAttachmentRecord(
        id,
        {
          ...saved,
          attachmentType: "completion",
          uploadedBy: auth.userId,
        },
        auth.userId,
        auth.role
      )
    }

    const detail = await getTaskDetail(id, auth.userId, auth.role)

    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:complete",
      resourceType: "tasks",
      resourceId: id,
      statusCode: 200,
    })

    return NextResponse.json(taskDetailResponseSchema.parse({ item: detail }))
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось завершить задачу"
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
