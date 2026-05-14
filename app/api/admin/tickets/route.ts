import { NextRequest, NextResponse } from "next/server"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  apiErrorSchema,
  ticketsListQuerySchema,
  ticketsListResponseSchema,
} from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["admin"])
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = ticketsListQuerySchema.safeParse(params)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные параметры заявок",
        code: "INVALID_QUERY",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const data = await getPortalRepositoryServer().listAdminTickets(parsed.data)
    return NextResponse.json(ticketsListResponseSchema.parse(data))
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось загрузить заявки", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
