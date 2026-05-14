import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  apiErrorSchema,
  employeeDetailResponseSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    requireAuth(request)
    const { id } = await context.params

    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор сотрудника",
        code: "INVALID_ID",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    const result = await getPortalRepositoryServer().getEmployeeById(parsedId.data)

    if (!result.item) {
      const payload = apiErrorSchema.parse({
        error: "Сотрудник не найден",
        code: "NOT_FOUND",
      })
      return NextResponse.json(payload, { status: 404 })
    }

    const response = employeeDetailResponseSchema.parse(result)
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
      error: "Не удалось загрузить сотрудника",
      code: "INTERNAL_ERROR",
    })
    return NextResponse.json(payload, { status: 500 })
  }
}
