"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { countWorkingDays } from "@/lib/utils/working-days"
import { VACATION_TYPE_OPTIONS } from "@/lib/portal-data/vacations-ui"
import type { VacationItem, VacationType } from "@/types/portal"

interface VacationRequestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: VacationItem) => void
}

export function VacationRequestSheet({
  open,
  onOpenChange,
  onCreated,
}: VacationRequestSheetProps) {
  const [type, setType] = useState<VacationType>("annual")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setType("annual")
      setStartDate("")
      setEndDate("")
      setComment("")
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    if (startDate > endDate) return 0
    return countWorkingDays(startDate, endDate)
  }, [startDate, endDate])

  const canSubmit = startDate.length > 0 && endDate.length > 0 && workingDays > 0 && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/vacations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          type,
          comment: comment.trim() ? comment.trim() : null,
        }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Не удалось отправить заявку")
      }
      const created = (await response.json()) as VacationItem
      onCreated(created)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Подать заявку на отпуск</SheetTitle>
          <SheetDescription>
            Заявка будет отправлена руководителю на согласование.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="vacation-type">Тип отпуска</Label>
            <Select value={type} onValueChange={(value) => setType(value as VacationType)}>
              <SelectTrigger id="vacation-type" className="w-full">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {VACATION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vacation-start">Дата начала</Label>
              <Input
                id="vacation-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacation-end">Дата окончания</Label>
              <Input
                id="vacation-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
            Рабочих дней: <strong>{workingDays}</strong>
            {startDate && endDate && startDate > endDate && (
              <p className="mt-1 text-xs text-destructive">
                Дата окончания должна быть позже или равна дате начала.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacation-comment">Комментарий</Label>
            <Textarea
              id="vacation-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Необязательное пояснение для руководителя"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            className="bg-[#16223b] hover:bg-[#16223b]/90"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? "Отправка..." : "Отправить заявку"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
