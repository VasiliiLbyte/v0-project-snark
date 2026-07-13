import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getTaskAttachmentForDownload } from "@/lib/repositories/tasks.repository"
import { resolveTaskAttachmentDownloadUrl } from "@/lib/storage/save-task-file"
import { apiErrorSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id, attachmentId } = await context.params
    const attachment = await getTaskAttachmentForDownload(id, attachmentId, auth.userId, auth.role)
    if (!attachment) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Вложение не найдено", code: "NOT_FOUND" }),
        { status: 404 }
      )
    }
    const downloadUrl = await resolveTaskAttachmentDownloadUrl(attachment.fileUrl)
    const target = downloadUrl.startsWith("http")
      ? downloadUrl
      : new URL(downloadUrl, request.url).toString()
    return NextResponse.redirect(target)
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось скачать файл" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
