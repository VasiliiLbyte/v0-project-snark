import { loadKnowledgeArticles } from "@/lib/portal-data/loaders"
import { KnowledgeBrowser } from "@/components/knowledge/knowledge-browser"
import type { KnowledgeCategory } from "@/types/portal"

export const dynamic = "force-dynamic"

interface KnowledgePageProps {
  searchParams?: Promise<{ category?: string; search?: string; page?: string }>
}

const ALLOWED_CATEGORIES: Array<"all" | KnowledgeCategory> = [
  "all",
  "onboarding",
  "it",
  "hr",
  "safety",
  "general",
]

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const params = (await searchParams) ?? {}
  const rawCategory = params.category ?? "all"
  const category = (ALLOWED_CATEGORIES as string[]).includes(rawCategory)
    ? (rawCategory as "all" | KnowledgeCategory)
    : "all"
  const search = params.search?.trim() ?? ""
  const pageParam = Number(params.page ?? "1")
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const data = await loadKnowledgeArticles(
    {
      category,
      search: search.length > 0 ? search : undefined,
      page,
      limit: 12,
    },
    false
  )

  return (
    <KnowledgeBrowser
      initial={data}
      activeCategory={category}
      initialSearch={search}
      page={page}
    />
  )
}
