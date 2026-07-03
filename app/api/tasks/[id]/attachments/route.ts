import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { createTaskAttachmentRecord, getTaskDetail } from "@/lib/repositories/tasks.repository"
import { saveTaskFile } from "@/lib/storage/save-task-file"
import { apiErrorSchema, taskAttachmentSchema } from "@/lib/validators/portal"

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
    return NextResponse.json({ items: task.attachments })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось загрузить вложения" : (known.message ?? "Ошибка доступа"),
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
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Выберите файл", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    const saved = await saveTaskFile(id, file)
    const attachment = await createTaskAttachmentRecord(
      id,
      {
        ...saved,
        attachmentType: "general",
        uploadedBy: auth.userId,
      },
      auth.userId,
      auth.role
    )

    await writeAuditLog({
      userId: auth.userId,
      action: "user:tasks:attachment:create",
      resourceType: "task_attachments",
      resourceId: attachment.id,
      statusCode: 201,
    })

    return NextResponse.json({ item: taskAttachmentSchema.parse(attachment) }, { status: 201 })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось загрузить файл"
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
