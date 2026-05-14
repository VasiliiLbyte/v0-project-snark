import { NextRequest, NextResponse } from "next/server"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import { apiErrorSchema, newsDetailResponseSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const response = await getPortalRepositoryServer().getNewsById(id, false)
    return NextResponse.json(newsDetailResponseSchema.parse(response))
  } catch {
    const payload = apiErrorSchema.parse({
      error: "Не удалось загрузить новость",
      code: "INTERNAL_ERROR",
    })
    return NextResponse.json(payload, { status: 500 })
  }
}
