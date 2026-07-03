import { notFound, redirect } from "next/navigation"
import { TaskDetailContent } from "@/components/tasks/task-detail-content"
import { getServerSession } from "@/lib/auth/server-session"
import { loadContactsData } from "@/lib/portal-data/loaders"
import { getTaskDetail } from "@/lib/repositories/tasks.repository"

export const dynamic = "force-dynamic"

interface TaskDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TaskDetailPageProps) {
  const { id } = await params
  const session = await getServerSession()
  if (!session) return { title: "Задача" }
  const task = await getTaskDetail(id, session.userId, session.role)
  return { title: task?.title ?? "Задача" }
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const [task, contacts] = await Promise.all([
    getTaskDetail(id, session.userId, session.role),
    loadContactsData({ limit: 300 }),
  ])

  if (!task) {
    notFound()
  }

  return <TaskDetailContent task={task} employees={contacts.employees} currentUserId={session.userId} />
}
