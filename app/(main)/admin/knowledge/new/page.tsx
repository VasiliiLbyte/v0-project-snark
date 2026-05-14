import { redirect } from "next/navigation"
import { KnowledgeEditorForm } from "@/components/admin/knowledge-editor-form"
import { getServerSession } from "@/lib/auth/server-session"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Новая статья базы знаний",
}

export default async function NewKnowledgeArticlePage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "admin" && session.role !== "hr_manager") {
    redirect("/admin")
  }
  return <KnowledgeEditorForm />
}
