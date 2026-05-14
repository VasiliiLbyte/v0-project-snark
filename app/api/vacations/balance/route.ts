import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import { apiErrorSchema, vacationBalanceSchema } from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const balance = await getPortalRepositoryServer().getMyVacationBalance(auth.userId)
    return NextResponse.json(vacationBalanceSchema.parse(balance))
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({
            error: "Не удалось загрузить остаток отпуска",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
