import { redirect } from "next/navigation"
import { AdminDepartmentsTable } from "@/components/admin/admin-departments-table"
import { getServerSession } from "@/lib/auth/server-session"
import { loadAdminDepartments } from "@/lib/portal-data/loaders"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Подразделения — Админ-панель",
}

export default async function AdminDepartmentsPage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "admin" && session.role !== "hr_manager") {
    redirect("/admin")
  }
  const [data, employees] = await Promise.all([
    loadAdminDepartments(),
    getPortalRepositoryServer().listAdminEmployees(),
  ])
  return <AdminDepartmentsTable initial={data} employees={employees.items} />
}
