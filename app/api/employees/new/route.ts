import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import { apiErrorSchema, newEmployeesResponseSchema } from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    const items = await getPortalRepositoryServer().getNewEmployees()
    const response = newEmployeesResponseSchema.parse({ items })
    return NextResponse.json(response)
  } catch (error) {
    const known = error as Partial<AuthError>
    if (known.status) {
      const payload = apiErrorSchema.parse({
        error: known.message ?? "Ошибка авторизации",
        code: known.code ?? "AUTH_ERROR",
      })
      return NextResponse.json(payload, { status: known.status })
    }
    const payload = apiErrorSchema.parse({
      error: "Не удалось загрузить новых сотрудников",
      code: "INTERNAL_ERROR",
    })
    return NextResponse.json(payload, { status: 500 })
  }
}
