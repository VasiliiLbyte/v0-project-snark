"use client"

import type { ReactNode } from "react"
import { parseLiteMarkdown, type LiteSegment } from "@/lib/markdown/lite"
import type { MentionCandidate } from "@/lib/mentions/parse"
import { splitMentions } from "@/lib/mentions/parse"
import { cn } from "@/lib/utils"

function renderSegments(segments: LiteSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`
    if (segment.type === "bold") {
      return (
        <strong key={key} className="font-semibold">
          {segment.text}
        </strong>
      )
    }
    if (segment.type === "italic") {
      return (
        <em key={key} className="italic">
          {segment.text}
        </em>
      )
    }
    if (segment.type === "code") {
      return (
        <code
          key={key}
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15"
        >
          {segment.text}
        </code>
      )
    }
    if (segment.type === "link") {
      return (
        <a
          key={key}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {segment.text}
        </a>
      )
    }
    return <span key={key}>{segment.text}</span>
  })
}

/** Рендер описания задачи / комментария: markdown-lite + автоссылки. */
export function LiteMarkdownText({
  text,
  className,
}: {
  text: string
  className?: string
}): ReactNode {
  return (
    <p className={cn("whitespace-pre-wrap text-sm", className)}>
      {renderSegments(parseLiteMarkdown(text), "lite")}
    </p>
  )
}

export function MessageBodyWithMentions({
  body,
  employees,
  className,
}: {
  body: string
  employees: MentionCandidate[]
  className?: string
}): ReactNode {
  const parts = splitMentions(body, employees)
  return (
    <p className={cn("mt-1 whitespace-pre-wrap text-sm", className)}>
      {parts.map((part, index) =>
        part.mention ? (
          <span
            key={index}
            className="rounded bg-accent/30 px-0.5 font-medium text-accent-foreground"
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{renderSegments(parseLiteMarkdown(part.text), `m-${index}`)}</span>
        )
      )}
    </p>
  )
}
