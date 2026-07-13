import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getTaskDetail } from "@/lib/repositories/tasks.repository"
import { apiErrorSchema, taskActivityItemSchema } from "@/lib/validators/portal"
import { z } from "zod"

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
    return NextResponse.json({
      items: z.array(taskActivityItemSchema).parse(task.activity ?? []),
    })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? "Не удалось загрузить историю" : (known.message ?? "Ошибка"),
        code: status === 500 ? "INTERNAL_ERROR" : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
