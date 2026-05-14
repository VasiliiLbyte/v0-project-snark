import { redirect } from "next/navigation"
import { AdminVacationsTable } from "@/components/admin/admin-vacations-table"
import { getServerSession } from "@/lib/auth/server-session"
import { loadAdminVacations } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Отпуска — Админ-панель",
}

export default async function AdminVacationsPage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "admin" && session.role !== "hr_manager") {
    redirect("/admin")
  }
  const items = await loadAdminVacations({ status: "pending" })
  return <AdminVacationsTable initial={items} />
}
