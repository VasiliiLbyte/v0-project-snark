import { Dashboard } from "@/components/pages/dashboard"
import { getServerSession } from "@/lib/auth/server-session"
import { loadDashboardData } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getServerSession()
  const data = await loadDashboardData(session?.userId)
  return <Dashboard data={data} />
}
