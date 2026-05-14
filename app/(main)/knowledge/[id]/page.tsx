import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { ChevronRight, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { loadKnowledgeArticleById } from "@/lib/portal-data/loaders"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  KNOWLEDGE_CATEGORY_LABEL,
  formatKnowledgeDate,
} from "@/lib/portal-data/knowledge-ui"

export const dynamic = "force-dynamic"

interface KnowledgeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function KnowledgeDetailPage({ params }: KnowledgeDetailPageProps) {
  const { id } = await params
  const data = await loadKnowledgeArticleById(id, false)
  if (!data.item) notFound()

  const repo = getPortalRepositoryServer()
  await repo.incrementKnowledgeArticleViews(id)
  const item = { ...data.item, viewsCount: data.item.viewsCount + 1 }

  return (
    <article className="space-y-4">
      <nav
        aria-label="Хлебные крошки"
        className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/knowledge" className="hover:text-primary">
          База знаний
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link
          href={`/knowledge?category=${item.category}`}
          className="hover:text-primary"
        >
          {KNOWLEDGE_CATEGORY_LABEL[item.category]}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-card-foreground">{item.title}</span>
      </nav>

      <Card className="space-y-6 p-6 md:p-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-card-foreground">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>{item.authorName}</span>
            <span>{formatKnowledgeDate(item.updatedAt)}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {item.viewsCount}
            </span>
          </div>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="prose prose-sm max-w-none text-card-foreground">
          <ReactMarkdown>{item.content}</ReactMarkdown>
        </div>
      </Card>
    </article>
  )
}
