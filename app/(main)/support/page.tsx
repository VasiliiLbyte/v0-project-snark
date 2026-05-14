import { redirect } from "next/navigation"
import { SupportPageContent } from "@/components/support/support-page-content"
import { getServerSession } from "@/lib/auth/server-session"
import { loadMyTickets } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Поддержка",
}

export default async function SupportPage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  const data = await loadMyTickets(session.userId, { page: 1, limit: 20 })
  return <SupportPageContent initial={data} />
}
