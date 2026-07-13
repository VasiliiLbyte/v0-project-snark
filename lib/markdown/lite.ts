/** Markdown-lite + автоссылки без HTML. Только безопасные сегменты для React. */

export type LiteSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; href: string; text: string }

function sanitizeHref(raw: string): string | null {
  const trimmed = raw.replace(/[.,);:!?\]]+$/g, "")
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      if (url.protocol !== "http:" && url.protocol !== "https:") return null
      return url.toString()
    } catch {
      return null
    }
  }
  if (/^www\./i.test(trimmed)) {
    try {
      return new URL(`https://${trimmed}`).toString()
    } catch {
      return null
    }
  }
  return null
}

function splitByRegex(
  text: string,
  pattern: RegExp,
  mapMatch: (inner: string, raw: string) => LiteSegment | LiteSegment[]
): LiteSegment[] {
  const parts: LiteSegment[] = []
  let last = 0
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", text: text.slice(last, match.index) })
    }
    const mapped = mapMatch(match[1] ?? "", match[0])
    if (Array.isArray(mapped)) parts.push(...mapped)
    else parts.push(mapped)
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ type: "text", text: text.slice(last) })
  }
  return parts.length > 0 ? parts : [{ type: "text", text }]
}

function splitLinks(text: string): LiteSegment[] {
  return splitByRegex(text, /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi, (_inner, raw) => {
    const href = sanitizeHref(raw)
    if (!href) return { type: "text", text: raw }
    const display = raw.replace(/[.,);:!?\]]+$/g, "")
    const trailing = raw.slice(display.length)
    if (trailing) {
      return [
        { type: "link", href, text: display },
        { type: "text", text: trailing },
      ]
    }
    return { type: "link", href, text: display }
  })
}

function mapTextLayers(text: string): LiteSegment[] {
  // 1) code `...`
  const withCode = splitByRegex(text, /`([^`]+)`/g, (inner) => ({ type: "code", text: inner }))
  // 2) bold **...**
  const withBold: LiteSegment[] = []
  for (const part of withCode) {
    if (part.type !== "text") {
      withBold.push(part)
      continue
    }
    withBold.push(
      ...splitByRegex(part.text, /\*\*([^*]+)\*\*/g, (inner) => ({ type: "bold", text: inner }))
    )
  }
  // 3) italic *...*
  const withItalic: LiteSegment[] = []
  for (const part of withBold) {
    if (part.type !== "text") {
      withItalic.push(part)
      continue
    }
    withItalic.push(
      ...splitByRegex(part.text, /(?<!\*)\*([^*]+)\*(?!\*)/g, (inner) => ({
        type: "italic",
        text: inner,
      }))
    )
  }
  // 4) autolinks
  const result: LiteSegment[] = []
  for (const part of withItalic) {
    if (part.type !== "text") {
      result.push(part)
      continue
    }
    result.push(...splitLinks(part.text))
  }
  return result
}

/**
 * Парсит plain-текст: `code`, **bold**, *italic*, http(s)/www ссылки.
 * HTML не исполняется.
 */
export function parseLiteMarkdown(input: string): LiteSegment[] {
  if (!input) return [{ type: "text", text: "" }]
  return mapTextLayers(input)
}

/** Экранирует опасные схемы ссылок — для тестов. */
export function isSafeHttpUrl(value: string): boolean {
  return sanitizeHref(value) !== null
}
