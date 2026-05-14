import { NextRequest, NextResponse } from "next/server"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  apiErrorSchema,
  knowledgeListQuerySchema,
  knowledgeListResponseSchema,
} from "@/lib/validators/portal"

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = knowledgeListQuerySchema.safeParse(params)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные параметры запроса",
        code: "INVALID_QUERY",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const data = await getPortalRepositoryServer().listKnowledgeArticles(parsed.data, false)
    const response = knowledgeListResponseSchema.parse(data)
    return NextResponse.json(response)
  } catch {
    const payload = apiErrorSchema.parse({
      error: "Не удалось загрузить статьи базы знаний",
      code: "INTERNAL_ERROR",
    })
    return NextResponse.json(payload, { status: 500 })
  }
}
