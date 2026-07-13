import { describe, expect, it } from "vitest"
import { isSafeHttpUrl, parseLiteMarkdown } from "@/lib/markdown/lite"

describe("Iteration 5 — markdown-lite + autolinks", () => {
  it("parses bold italic and code", () => {
    const parts = parseLiteMarkdown("см. **важно** и *мягко* плюс `code`")
    expect(parts.some((p) => p.type === "bold" && p.text === "важно")).toBe(true)
    expect(parts.some((p) => p.type === "italic" && p.text === "мягко")).toBe(true)
    expect(parts.some((p) => p.type === "code" && p.text === "code")).toBe(true)
  })

  it("parses https and www links", () => {
    const parts = parseLiteMarkdown("открыть https://example.com/path и www.test.ru ок")
    const links = parts.filter((p) => p.type === "link")
    expect(links).toHaveLength(2)
    expect(links[0]).toMatchObject({ type: "link", href: "https://example.com/path" })
    expect(links[1]?.type).toBe("link")
    if (links[1]?.type === "link") {
      expect(links[1].href.startsWith("https://www.test.ru")).toBe(true)
    }
  })

  it("rejects javascript: urls", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isSafeHttpUrl("https://ok.example")).toBe(true)
  })

  it("does not treat raw html as markup", () => {
    const parts = parseLiteMarkdown('<script>alert(1)</script> **x**')
    expect(parts.some((p) => p.type === "text" && p.text.includes("<script>"))).toBe(true)
    expect(parts.some((p) => p.type === "bold" && p.text === "x")).toBe(true)
  })
})
