import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { listNotifications, markAllNotificationsRead } from "@/lib/repositories/notifications.repository"
import { apiErrorSchema } from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const data = await listNotifications(auth.userId, 20)
    return NextResponse.json(data)
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось загрузить уведомления" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const body = (await request.json().catch(() => ({}))) as { action?: string }
    if (body.action === "read_all") {
      const count = await markAllNotificationsRead(auth.userId)
      return NextResponse.json({ ok: true, count })
    }
    return NextResponse.json(
      apiErrorSchema.parse({ error: "Неизвестное действие", code: "INVALID_PAYLOAD" }),
      { status: 400 }
    )
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось обновить" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
