import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { countOverdueTasks } from "@/lib/repositories/tasks.repository"
import { apiErrorSchema } from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const overdueCount = await countOverdueTasks(auth.userId, auth.role)
    return NextResponse.json({ overdueCount })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось загрузить статистику" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
