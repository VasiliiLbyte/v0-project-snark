import { redirect } from "next/navigation"
import { TasksPageContent } from "@/components/tasks/tasks-page-content"
import { getServerSession } from "@/lib/auth/server-session"
import { loadContactsData } from "@/lib/portal-data/loaders"
import { listTasks } from "@/lib/repositories/tasks.repository"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Задачи",
}

export default async function TasksPage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  const [data, contacts] = await Promise.all([
    listTasks(session.userId, { page: 1, limit: 50 }, session.role),
    loadContactsData({ limit: 300 }),
  ])
  return (
    <TasksPageContent
      initial={data}
      employees={contacts.employees}
      currentUserId={session.userId}
    />
  )
}
