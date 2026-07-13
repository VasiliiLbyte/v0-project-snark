"use client"

import { useCallback, useEffect, useState } from "react"
import { LiteMarkdownText } from "@/components/chat/message-body-with-mentions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealtimeEvents } from "@/hooks/use-realtime-events"
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

  const loadMessages = useCallback(async (id: string) => {
    const msgRes = await fetch(`/api/chat/channels/${id}/messages`)
    if (msgRes.ok) {
      const msgData = (await msgRes.json()) as { items: ChatMessage[] }
      setMessages(msgData.items)
    }
  }, [])

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
      await loadMessages(chatData.channelId)
    } finally {
      setLoading(false)
    }
  }, [taskId, loadMessages])

  useEffect(() => {
    void initChat()
  }, [initChat])

  useRealtimeEvents({
    enabled: Boolean(channelId),
    onEvent: (event) => {
      if (!channelId || !("channelId" in event) || event.channelId !== channelId) return
      if (event.type === "message.new") {
        setMessages((prev) =>
          prev.some((item) => item.id === event.message.id) ? prev : [...prev, event.message]
        )
      } else if (event.type === "message.updated") {
        setMessages((prev) =>
          prev.map((item) => (item.id === event.message.id ? event.message : item))
        )
      } else if (event.type === "message.deleted") {
        setMessages((prev) => prev.filter((item) => item.id !== event.messageId))
      }
    },
    onFallbackPoll: () => {
      if (channelId) void loadMessages(channelId)
    },
  })

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
    setMessages((prev) =>
      prev.some((item) => item.id === data.item.id) ? prev : [...prev, data.item]
    )
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
    <div className="flex h-[320px] flex-col rounded-lg border">
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет сообщений</p>
          ) : (
            messages.map((message) => {
              const mine = message.authorId === currentUserId
              return (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <div className="flex justify-between gap-2 text-[11px] opacity-80">
                    <span>{mine ? "Вы" : message.authorName}</span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <LiteMarkdownText text={message.body} className="mt-1" />
                </div>
              )
            })
          )}
        </div>
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
