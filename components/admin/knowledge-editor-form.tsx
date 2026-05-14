"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { KNOWLEDGE_CATEGORIES } from "@/lib/portal-data/knowledge-ui"
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeEditorPayload,
} from "@/types/portal"

interface KnowledgeEditorFormProps {
  articleId?: string
  initial?: KnowledgeArticle | null
}

interface FormState {
  title: string
  content: string
  category: KnowledgeCategory
  tags: string
  isPublished: boolean
}

const DEFAULT_FORM: FormState = {
  title: "",
  content: "",
  category: "general",
  tags: "",
  isPublished: false,
}

function fromArticle(article: KnowledgeArticle): FormState {
  return {
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags.join(", "),
    isPublished: article.isPublished,
  }
}

export function KnowledgeEditorForm({ articleId, initial }: KnowledgeEditorFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initial ? fromArticle(initial) : DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) setForm(fromArticle(initial))
  }, [initial])

  const previewText = useMemo(
    () => form.content || "_Начните вводить markdown..._",
    [form.content]
  )

  const submit = async (publish: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const payload: KnowledgeEditorPayload = {
        title: form.title,
        content: form.content,
        category: form.category,
        tags: form.tags.trim().length > 0 ? form.tags.trim() : null,
        isPublished: publish,
      }
      const url = articleId ? `/api/admin/knowledge/${articleId}` : "/api/admin/knowledge"
      const method = articleId ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось сохранить статью")
        return
      }
      router.push("/admin/knowledge")
      router.refresh()
    } catch {
      setError("Ошибка сети при сохранении статьи")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/admin/knowledge" className="text-sm text-primary hover:underline">
          ← К списку статей
        </Link>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => submit(false)}
          >
            Сохранить черновик
          </Button>
          <Button
            type="button"
            className="bg-[#16223b] hover:bg-[#16223b]/90"
            disabled={saving}
            onClick={() => submit(true)}
          >
            {form.isPublished ? "Сохранить" : "Сохранить и опубликовать"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="kb-title">Заголовок</Label>
            <Input
              id="kb-title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-category">Категория</Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, category: value as KnowledgeCategory }))
              }
            >
              <SelectTrigger id="kb-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_CATEGORIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-tags">Теги</Label>
            <Input
              id="kb-tags"
              placeholder="Через запятую: новички, регламент, инструкция"
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-content">Текст статьи (Markdown)</Label>
            <Textarea
              id="kb-content"
              className="min-h-72"
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="kb-published"
              checked={form.isPublished}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isPublished: checked }))
              }
            />
            <Label htmlFor="kb-published">Опубликовано</Label>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-card-foreground">Превью</h2>
          <h3 className="text-xl font-semibold text-card-foreground">
            {form.title || "Без заголовка"}
          </h3>
          {form.tags.trim().length > 0 && (
            <div className="flex flex-wrap gap-1">
              {form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          )}
          <div className="prose prose-sm max-w-none text-card-foreground">
            <ReactMarkdown>{previewText}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  )
}
