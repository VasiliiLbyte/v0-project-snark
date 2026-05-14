"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  EVENT_CATEGORY_LABEL,
  EVENT_CATEGORY_OPTIONS,
} from "@/lib/portal-data/events-ui"
import type { EventCategory } from "@/types/portal"

interface EventCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMonth: string
  onCreated: () => void | Promise<void>
}

function defaultStartLocal(month: string): string {
  const [yearStr, monthStr] = month.split("-")
  const year = Number(yearStr)
  const m = Number(monthStr)
  const today = new Date()
  const useDate =
    today.getFullYear() === year && today.getMonth() + 1 === m ? today.getDate() : 1
  return `${year}-${String(m).padStart(2, "0")}-${String(useDate).padStart(2, "0")}T09:00`
}

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString()
}

export function EventCreateDialog({
  open,
  onOpenChange,
  defaultMonth,
  onCreated,
}: EventCreateDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState<EventCategory>("meeting")
  const [isAllDay, setIsAllDay] = useState(false)
  const [startAt, setStartAt] = useState(() => defaultStartLocal(defaultMonth))
  const [endAt, setEndAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setDescription("")
    setLocation("")
    setCategory("meeting")
    setIsAllDay(false)
    setStartAt(defaultStartLocal(defaultMonth))
    setEndAt("")
    setError(null)
  }, [open, defaultMonth])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError("Укажите название события")
      return
    }
    if (!startAt) {
      setError("Укажите дату и время начала")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          startAt: toIsoFromLocal(startAt),
          endAt: endAt ? toIsoFromLocal(endAt) : null,
          location: location.trim() ? location.trim() : null,
          category,
          isAllDay,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "Не удалось создать событие")
        return
      }
      await onCreated()
    } catch {
      setError("Сетевая ошибка при создании события")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое событие</DialogTitle>
          <DialogDescription>
            Событие появится на календаре и в общей ленте.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" aria-busy={submitting}>
          <div className="space-y-2">
            <Label htmlFor="event-title">Название</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-category">Категория</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as EventCategory)}
              >
                <SelectTrigger id="event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {EVENT_CATEGORY_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">Место (опционально)</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                placeholder="Переговорная 3, онлайн, …"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-start">Начало</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Окончание (опционально)</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="event-all-day" className="text-sm font-medium">
                Весь день
              </Label>
              <p className="text-xs text-muted-foreground">
                Время начала и окончания будет скрыто
              </p>
            </div>
            <Switch id="event-all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Описание (опционально)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Создаём..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
