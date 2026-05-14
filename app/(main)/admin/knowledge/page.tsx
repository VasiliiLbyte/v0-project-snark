import { redirect } from "next/navigation"
import { AdminKnowledgeTable } from "@/components/admin/admin-knowledge-table"
import { getServerSession } from "@/lib/auth/server-session"
import { loadKnowledgeArticles } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "База знаний — Админ-панель",
}

export default async function AdminKnowledgePage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "admin" && session.role !== "hr_manager") {
    redirect("/admin")
  }
  const data = await loadKnowledgeArticles({ limit: 100 }, true)
  return <AdminKnowledgeTable initial={data} />
}
