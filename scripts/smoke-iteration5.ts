/**
 * Smoke / нагрузочный минимальный прогон realtime-шины и markdown parser.
 * Не заменяет полноценный k6; проверяет, что 100 подписчиков + publish не падают.
 *
 * Запуск: npx tsx scripts/smoke-iteration5.ts
 */
import { eventVisibleToUser, getRealtimeBus } from "../lib/realtime/bus"
import { parseLiteMarkdown } from "../lib/markdown/lite"

async function main() {
  const bus = getRealtimeBus()
  let received = 0
  const unsubs: Array<() => void> = []

  for (let i = 0; i < 100; i++) {
    const userId = `user-${i}`
    unsubs.push(
      bus.subscribe((event) => {
        if (eventVisibleToUser(event, userId)) received++
      })
    )
  }

  const started = Date.now()
  for (let i = 0; i < 50; i++) {
    bus.publish({
      type: "channel.updated",
      channelId: "ch-smoke",
      memberIds: Array.from({ length: 100 }, (_, idx) => `user-${idx}`),
    })
  }
  const elapsed = Date.now() - started

  for (const unsub of unsubs) unsub()

  const md = parseLiteMarkdown("**smoke** https://example.com `ok`")
  const hasBold = md.some((p) => p.type === "bold")
  const hasLink = md.some((p) => p.type === "link")

  console.log(
    JSON.stringify(
      {
        ok: received === 100 * 50 && hasBold && hasLink,
        received,
        expected: 100 * 50,
        publishMs: elapsed,
      },
      null,
      2
    )
  )

  if (received !== 100 * 50 || !hasBold || !hasLink) {
    process.exitCode = 1
  }
}

void main()
