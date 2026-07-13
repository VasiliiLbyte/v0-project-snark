import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { markNotificationRead } from "@/lib/repositories/notifications.repository"
import { apiErrorSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const item = await markNotificationRead(auth.userId, id)
    if (!item) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Уведомление не найдено", code: "NOT_FOUND" }),
        { status: 404 }
      )
    }
    return NextResponse.json({ item })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось отметить" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
