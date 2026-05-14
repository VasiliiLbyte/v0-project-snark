import { notFound, redirect } from "next/navigation"
import { KnowledgeEditorForm } from "@/components/admin/knowledge-editor-form"
import { getServerSession } from "@/lib/auth/server-session"
import { loadKnowledgeArticleById } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Редактирование статьи базы знаний",
}

interface EditKnowledgeArticlePageProps {
  params: Promise<{ id: string }>
}

export default async function EditKnowledgeArticlePage({
  params,
}: EditKnowledgeArticlePageProps) {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "admin" && session.role !== "hr_manager") {
    redirect("/admin")
  }
  const { id } = await params
  const data = await loadKnowledgeArticleById(id, true)
  if (!data.item) notFound()
  return <KnowledgeEditorForm articleId={id} initial={data.item} />
}
