"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckSquare, ClipboardList, MessageSquare, UserPlus, Users } from "lucide-react"
import { EmployeePicker } from "@/components/shared/employee-picker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  ChatChannel,
  ChatChannelsListResponse,
  ChatMessage,
  Employee,
  PortalTask,
} from "@/types/portal"

interface ChatPageContentProps {
  initial: ChatChannelsListResponse
  employees: Employee[]
  currentUserId: string
}

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function channelTitle(channel: ChatChannel): string {
  if (channel.type === "direct") return channel.peerName ?? "Личный чат"
  if (channel.type === "task") return channel.name ?? "Чат задачи"
  return channel.name ?? "Групповой чат"
}

export function ChatPageContent({ initial, employees, currentUserId }: ChatPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [channels, setChannels] = useState(initial.items)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(initial.items[0]?.id ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageBody, setMessageBody] = useState("")
  const [groupName, setGroupName] = useState("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [openingDirect, setOpeningDirect] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskFromMessage, setTaskFromMessage] = useState<ChatMessage | null>(null)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [creatingTask, setCreatingTask] = useState(false)
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)

  const colleagues = useMemo(
    () => employees.filter((employee) => employee.userId !== currentUserId),
    [employees, currentUserId]
  )

  const filteredColleagues = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return colleagues.slice(0, 8)
    return colleagues
      .filter(
        (employee) =>
          employee.name.toLowerCase().includes(query) ||
          employee.position.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query)
      )
      .slice(0, 12)
  }, [colleagues, employeeSearch])

  const directChannels = useMemo(
    () => channels.filter((channel) => channel.type === "direct"),
    [channels]
  )
  const taskChannels = useMemo(
    () => channels.filter((channel) => channel.type === "task"),
    [channels]
  )
  const groupChannels = useMemo(
    () => channels.filter((channel) => channel.type === "group" || channel.type === "department"),
    [channels]
  )

  const loadMessages = useCallback(async (channelId: string, silent = false) => {
    if (!silent) setLoadingMessages(true)
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/messages`)
      if (!response.ok) {
        if (!silent) setError("Не удалось загрузить сообщения")
        return
      }
      const data = (await response.json()) as { items: ChatMessage[] }
      setMessages(data.items)
      setError(null)
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (activeChannelId) {
      void loadMessages(activeChannelId)
    } else {
      setMessages([])
    }
  }, [activeChannelId, loadMessages])

  const refreshChannels = useCallback(async () => {
    const response = await fetch("/api/chat/channels")
    if (!response.ok) return
    const data = (await response.json()) as ChatChannelsListResponse
    setChannels(data.items)
    return data.items
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeChannelId) void loadMessages(activeChannelId, true)
      void refreshChannels()
    }, 5000)
    return () => clearInterval(timer)
  }, [activeChannelId, loadMessages, refreshChannels])

  const openDirectChat = useCallback(
    async (peerId: string) => {
      if (peerId === currentUserId) return
      setOpeningDirect(true)
      setError(null)
      try {
        const response = await fetch("/api/chat/direct", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ peerId }),
        })
        const body = (await response.json().catch(() => ({}))) as { item?: ChatChannel; error?: string }
        if (!response.ok || !body.item) {
          setError(body.error ?? "Не удалось открыть диалог")
          return
        }
        const updated = await refreshChannels()
        setActiveChannelId(body.item.id)
        if (!updated?.some((channel) => channel.id === body.item?.id)) {
          setChannels((prev) => [body.item!, ...prev])
        }
        setEmployeeSearch("")
        startTransition(() => router.replace("/chat"))
      } catch {
        setError("Сетевая ошибка при открытии диалога")
      } finally {
        setOpeningDirect(false)
      }
    },
    [currentUserId, refreshChannels, router]
  )

  useEffect(() => {
    const peerId = searchParams.get("peer")
    const channelId = searchParams.get("channel")
    if (channelId) {
      setActiveChannelId(channelId)
      startTransition(() => router.replace("/chat"))
      return
    }
    if (peerId && peerId !== currentUserId) {
      void openDirectChat(peerId)
    }
  }, [searchParams, currentUserId, openDirectChat, router])

  const createGroup = async () => {
    setError(null)
    const response = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "group",
        name: groupName.trim() || "Общий чат",
        memberIds: selectedMemberId ? [selectedMemberId] : [],
      }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setError(body.error ?? "Не удалось создать чат")
      return
    }
    const body = (await response.json()) as { item: ChatChannel }
    setGroupName("")
    setSelectedMemberId(null)
    await refreshChannels()
    setActiveChannelId(body.item.id)
    startTransition(() => router.refresh())
  }

  const addMemberToGroup = async () => {
    if (!activeChannelId || !selectedMemberId) return
    setAddingMember(true)
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${activeChannelId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberIds: [selectedMemberId] }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось добавить участника")
        return
      }
      setSelectedMemberId(null)
      setMemberPickerOpen(false)
      await refreshChannels()
    } finally {
      setAddingMember(false)
    }
  }

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeChannelId || !messageBody.trim()) return
    setError(null)
    const response = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: messageBody.trim(),
        replyToId: replyTo?.id ?? null,
      }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setError(body.error ?? "Не удалось отправить сообщение")
      return
    }
    setMessageBody("")
    setReplyTo(null)
    await loadMessages(activeChannelId, true)
    await refreshChannels()
  }

  const openCreateTaskDialog = (message: ChatMessage) => {
    setTaskFromMessage(message)
    setTaskTitle(message.body.slice(0, 120))
    setTaskDescription(`Цитата (${message.authorName}, ${formatTime(message.createdAt)}):\n${message.body}`)
    setTaskDialogOpen(true)
  }

  const createTaskFromMessage = async () => {
    if (!taskFromMessage || !activeChannelId || !taskTitle.trim()) return
    setCreatingTask(true)
    setError(null)
    try {
      const response = await fetch("/api/tasks/from-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          sourceMessageId: taskFromMessage.id,
          sourceChannelId: activeChannelId,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        item?: PortalTask
        error?: string
      }
      if (!response.ok || !body.item) {
        setError(body.error ?? "Не удалось создать задачу")
        return
      }
      setTaskDialogOpen(false)
      setTaskFromMessage(null)
      await loadMessages(activeChannelId, true)
      await refreshChannels()
      router.push(`/tasks/${body.item.id}`)
    } finally {
      setCreatingTask(false)
    }
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null

  const renderChannelButton = (channel: ChatChannel) => (
    <button
      key={channel.id}
      type="button"
      onClick={() => setActiveChannelId(channel.id)}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
        activeChannelId === channel.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium line-clamp-1">{channelTitle(channel)}</span>
        {channel.unreadCount > 0 ? (
          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
            {channel.unreadCount}
          </span>
        ) : null}
      </div>
      <div className="truncate text-xs opacity-80">
        {channel.lastMessage?.body ?? "Нет сообщений"}
      </div>
    </button>
  )

  const renderMessage = (message: ChatMessage) => {
    if (message.messageType === "system" || message.messageType === "task_created") {
      return (
        <div key={message.id} className="mx-auto max-w-[90%] text-center text-xs text-muted-foreground">
          <div className="rounded-full bg-muted px-3 py-1.5 inline-block">
            {message.body}
            {message.linkedTaskId ? (
              <>
                {" "}
                <Link href={`/tasks/${message.linkedTaskId}`} className="underline">
                  Открыть
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )
    }

    const isMine = message.authorId === currentUserId
    return (
      <div
        key={message.id}
        className={cn("group max-w-[85%] rounded-lg px-3 py-2", isMine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}
      >
        {message.replyToBody ? (
          <div
            className={cn(
              "mb-2 rounded border-l-2 px-2 py-1 text-xs opacity-80",
              isMine ? "border-primary-foreground/40" : "border-muted-foreground/40"
            )}
          >
            {message.replyToBody}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center justify-between gap-2 text-xs",
            isMine ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          <span className="font-medium">{isMine ? "Вы" : message.authorName}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
        {!isMine && activeChannel?.type !== "task" ? (
          <div className="mt-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant={isMine ? "secondary" : "outline"}
              className="h-7 text-xs"
              onClick={() => setReplyTo(message)}
            >
              Ответить
            </Button>
            <Button
              type="button"
              size="sm"
              variant={isMine ? "secondary" : "outline"}
              className="h-7 text-xs"
              onClick={() => openCreateTaskDialog(message)}
            >
              <CheckSquare className="mr-1 h-3 w-3" />
              Задача
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="flex flex-col p-4">
        <h1 className="text-xl font-semibold">Чат</h1>
        <p className="mt-1 text-sm text-muted-foreground">Личные, групповые и чаты задач</p>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="employee-search">
            Написать сотруднику
          </label>
          <Input
            id="employee-search"
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Поиск по имени или должности..."
            disabled={openingDirect}
          />
          {filteredColleagues.length > 0 ? (
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-1">
              {filteredColleagues.map((employee) => (
                <button
                  key={employee.userId}
                  type="button"
                  disabled={openingDirect}
                  onClick={() => void openDirectChat(employee.userId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{employee.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{employee.position}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Сотрудники не найдены</p>
          )}
        </div>

        <ScrollArea className="mt-4 flex-1">
          <div className="space-y-4 pr-2">
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                Задачи
              </p>
              <div className="space-y-1">
                {taskChannels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Чатов задач пока нет</p>
                ) : (
                  taskChannels.map(renderChannelButton)
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Личные
              </p>
              <div className="space-y-1">
                {directChannels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Диалогов пока нет</p>
                ) : (
                  directChannels.map(renderChannelButton)
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Групповые
              </p>
              <div className="space-y-1">
                {groupChannels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Групп пока нет</p>
                ) : (
                  groupChannels.map(renderChannelButton)
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-2 border-t pt-4">
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Название группового чата"
          />
          <EmployeePicker
            employees={colleagues}
            value={selectedMemberId}
            onChange={setSelectedMemberId}
            placeholder="Добавить участника (необязательно)"
          />
          <Button className="w-full" variant="outline" onClick={createGroup} disabled={pending}>
            Создать групповой чат
          </Button>
        </div>
      </Card>

      <Card className="flex min-h-[560px] flex-col p-4">
        <div className="border-b pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                {activeChannel ? channelTitle(activeChannel) : "Выберите диалог"}
              </h2>
              {activeChannel?.type === "direct" ? (
                <p className="text-sm text-muted-foreground">Личная переписка</p>
              ) : activeChannel?.type === "task" ? (
                <p className="text-sm text-muted-foreground">
                  Чат задачи
                  {activeChannel.taskId ? (
                    <>
                      {" · "}
                      <Link href={`/tasks/${activeChannel.taskId}`} className="underline">
                        Открыть задачу
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : activeChannel ? (
                <p className="text-sm text-muted-foreground">Участников: {activeChannel.memberCount}</p>
              ) : null}
            </div>
            {activeChannel &&
            (activeChannel.type === "group" || activeChannel.type === "department") ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMemberPickerOpen(true)}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollArea className="flex-1 py-4">
          {!activeChannelId ? (
            <p className="text-sm text-muted-foreground">
              Выберите сотрудника слева или откройте чат задачи.
            </p>
          ) : loadingMessages && messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сообщений пока нет. Напишите первым.</p>
          ) : (
            <div className="space-y-3">{messages.map(renderMessage)}</div>
          )}
        </ScrollArea>

        {replyTo ? (
          <div className="mt-2 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-xs">
            <span className="line-clamp-1">Ответ: {replyTo.body}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
              ✕
            </Button>
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="mt-4 flex gap-2 border-t pt-4">
          <Input
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Напишите сообщение..."
            disabled={!activeChannelId}
          />
          <Button type="submit" disabled={!activeChannelId || !messageBody.trim()}>
            Отправить
          </Button>
        </form>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </Card>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать задачу из сообщения</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-from-msg-title">Название</Label>
              <Input
                id="task-from-msg-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-from-msg-desc">Описание</Label>
              <Textarea
                id="task-from-msg-desc"
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void createTaskFromMessage()} disabled={creatingTask}>
              Создать задачу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <EmployeePicker
              employees={colleagues}
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              placeholder="Выберите сотрудника"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMemberPickerOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void addMemberToGroup()}
              disabled={!selectedMemberId || addingMember}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
