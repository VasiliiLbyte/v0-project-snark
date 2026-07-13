export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertSafeRuntimeMode } = await import("@/lib/config/mode")
    assertSafeRuntimeMode()
    const { startTaskReminderWorker } = await import("@/lib/workers/task-reminders")
    startTaskReminderWorker()
  }
}