"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { BookOpen, Eye, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_LABEL,
  formatKnowledgeDate,
} from "@/lib/portal-data/knowledge-ui"
import type { KnowledgeCategory, KnowledgeListResponse } from "@/types/portal"

interface KnowledgeBrowserProps {
  initial: KnowledgeListResponse
  activeCategory: "all" | KnowledgeCategory
  initialSearch: string
  page: number
}

function buildHref(params: { category: "all" | KnowledgeCategory; search: string; page: number }): string {
  const usp = new URLSearchParams()
  if (params.category !== "all") usp.set("category", params.category)
  if (params.search.length > 0) usp.set("search", params.search)
  if (params.page > 1) usp.set("page", String(params.page))
  const qs = usp.toString()
  return qs ? `/knowledge?${qs}` : "/knowledge"
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/\n+/g, " ")
    .trim()
}

export function KnowledgeBrowser({
  initial,
  activeCategory,
  initialSearch,
  page,
}: KnowledgeBrowserProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSearchValue(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const trimmed = searchValue.trim()
    if (trimmed === initialSearch) return
    const handle = setTimeout(() => {
      startTransition(() => {
        router.push(buildHref({ category: activeCategory, search: trimmed, page: 1 }))
      })
    }, 350)
    return () => clearTimeout(handle)
  }, [searchValue, initialSearch, activeCategory, router])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(initial.total / initial.limit)),
    [initial.total, initial.limit]
  )

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-card-foreground">База знаний</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Инструкции, регламенты и подсказки от экспертов компании.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Категории
          </div>
          <nav className="flex flex-col gap-1" aria-label="Категории базы знаний">
            <Link
              href={buildHref({ category: "all", search: searchValue.trim(), page: 1 })}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                activeCategory === "all"
                  ? "bg-[#16223b] text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Все статьи
            </Link>
            {KNOWLEDGE_CATEGORIES.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.value
              return (
                <Link
                  key={category.value}
                  href={buildHref({
                    category: category.value,
                    search: searchValue.trim(),
                    page: 1,
                  })}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-[#16223b] text-white"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {category.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Поиск по заголовку или содержанию"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="pl-9"
              aria-label="Поиск по статьям базы знаний"
            />
          </div>

          {initial.items.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-card-foreground">
                Здесь пока нет статей
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте сбросить фильтры или поискать по другому ключевому слову.
              </p>
            </Card>
          ) : (
            <div className={`grid gap-4 md:grid-cols-2 ${isPending ? "opacity-70" : ""}`}>
              {initial.items.map((item) => (
                <Link key={item.id} href={`/knowledge/${item.id}`} className="block h-full">
                  <Card className="flex h-full flex-col gap-3 p-5 transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {KNOWLEDGE_CATEGORY_LABEL[item.category]}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{item.viewsCount}</span>
                      </div>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-card-foreground">
                      {item.title}
                    </h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {stripMarkdown(item.content)}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatKnowledgeDate(item.updatedAt)}</span>
                      <span>{item.authorName}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={buildHref({
                  category: activeCategory,
                  search: searchValue.trim(),
                  page: Math.max(1, page - 1),
                })}
                aria-disabled={page <= 1}
                className={`rounded-md border px-3 py-2 text-sm ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Назад
              </Link>
              <span className="text-sm text-muted-foreground">
                Страница {page} из {totalPages}
              </span>
              <Link
                href={buildHref({
                  category: activeCategory,
                  search: searchValue.trim(),
                  page: Math.min(totalPages, page + 1),
                })}
                aria-disabled={page >= totalPages}
                className={`rounded-md border px-3 py-2 text-sm ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Вперёд
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
