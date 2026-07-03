"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/portal"

interface TaskInlineChatProps {
  taskId: string
  currentUserId: string
}

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function TaskInlineChat({ taskId, currentUserId }: TaskInlineChatProps) {
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initChat = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const chatRes = await fetch(`/api/tasks/${taskId}/chat`)
      if (!chatRes.ok) {
        setError("Не удалось открыть чат задачи")
        return
      }
      const chatData = (await chatRes.json()) as { channelId: string | null }
      if (!chatData.channelId) {
        setError("Чат задачи не создан")
        return
      }
      setChannelId(chatData.channelId)
      const msgRes = await fetch(`/api/chat/channels/${chatData.channelId}/messages`)
      if (msgRes.ok) {
        const msgData = (await msgRes.json()) as { items: ChatMessage[] }
        setMessages(msgData.items)
      }
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void initChat()
  }, [initChat])

  useEffect(() => {
    if (!channelId) return
    const timer = setInterval(async () => {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`)
      if (res.ok) {
        const data = (await res.json()) as { items: ChatMessage[] }
        setMessages(data.items)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [channelId])

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!channelId || !body.trim()) return
    const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    })
    if (!res.ok) return
    setBody("")
    const data = (await res.json()) as { item: ChatMessage }
    setMessages((prev) => [...prev, data.item])
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Загрузка чата...</p>
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void initChat()}>
          Создать / обновить чат
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[320px] flex-col rounded-md border">
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              if (message.messageType === "system" || message.messageType === "task_created") {
                return (
                  <p key={message.id} className="text-center text-xs text-muted-foreground">
                    {message.body}
                  </p>
                )
              }
              const isMine = message.authorId === currentUserId
              return (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-2 py-1.5 text-sm",
                    isMine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <div className="text-[10px] opacity-70">
                    {isMine ? "Вы" : message.authorName} · {formatTime(message.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
      <form onSubmit={sendMessage} className="flex gap-2 border-t p-2">
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Сообщение в чат задачи..."
        />
        <Button type="submit" size="sm" disabled={!body.trim()}>
          Отправить
        </Button>
      </form>
    </div>
  )
}
