import { NextRequest, NextResponse } from "next/server"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminVacationsListQuerySchema,
  adminVacationsListResponseSchema,
  apiErrorSchema,
} from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["admin", "hr_manager"])
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = adminVacationsListQuerySchema.safeParse(params)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные параметры выборки",
        code: "INVALID_QUERY",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const status = parsed.data.status ?? "pending"
    const items = await getPortalRepositoryServer().listAdminVacations({ status })
    return NextResponse.json(adminVacationsListResponseSchema.parse({ items }))
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({
            error: "Не удалось загрузить заявки на отпуск",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
