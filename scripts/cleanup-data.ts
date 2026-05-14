import { config } from "dotenv"
config({ path: ".env.local" })

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { departments, employeeProfiles, news, users } from "@/lib/db/schema"

interface CleanupSummary {
  deletedGarbageDepartments: number
  orphansCount: number
  assignedHeads: number
  skippedHeads: number
  deletedTestNews: number
}

const GARBAGE_DEPARTMENT_NAME = "23у23у23у"
const TEST_NEWS_TITLE = "Т"

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Проверьте .env.local")
  }

  const pool = new Pool({ connectionString })
  const db = drizzle(pool)

  const summary: CleanupSummary = {
    deletedGarbageDepartments: 0,
    orphansCount: 0,
    assignedHeads: 0,
    skippedHeads: 0,
    deletedTestNews: 0,
  }

  try {
    await db.transaction(async (tx) => {
      // ── Step 1. Удалить мусорный отдел "23у23у23у"
      const garbageCondition = sql`trim(${departments.name}) = ${GARBAGE_DEPARTMENT_NAME}`
      const garbage = await tx
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(garbageCondition)

      if (garbage.length === 0) {
        console.log("[step 1] Мусорный отдел отсутствует — пропускаем")
      } else {
        console.log(`[step 1] Найдено мусорных отделов: ${garbage.length}`)
        const deleted = await tx
          .delete(departments)
          .where(garbageCondition)
          .returning({ id: departments.id })
        summary.deletedGarbageDepartments = deleted.length
        console.log(
          `[step 1] Удалено отделов: ${deleted.length} (FK users.department_id, departments.parent_id, documents.linked_department_id выставлены в NULL автоматически)`
        )
      }

      // ── Step 2. Отчёт по сотрудникам без department_id с заполненным профилем
      const orphans = await tx
        .select({
          userId: users.id,
          fullName: sql<string>`trim(coalesce(${users.lastName}, '') || ' ' || coalesce(${users.firstName}, ''))`,
          positionTitle: employeeProfiles.positionTitle,
        })
        .from(users)
        .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
        .where(and(isNull(users.departmentId), eq(users.isActive, true)))

      summary.orphansCount = orphans.length
      if (orphans.length === 0) {
        console.log("[step 2] Сотрудников без отдела не найдено")
      } else {
        console.log(
          `[step 2] Сотрудников без отдела: ${orphans.length}. Список (только публичные поля):`
        )
        console.table(
          orphans.map((row) => ({
            userId: row.userId,
            fullName: row.fullName,
            positionTitle: row.positionTitle ?? "—",
          }))
        )
      }

      // ── Step 3. Назначить head_user_id для отделов с head_user_id IS NULL
      const headlessDepartments = await tx
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(isNull(departments.headUserId))

      if (headlessDepartments.length === 0) {
        console.log("[step 3] Все отделы уже имеют руководителя — пропускаем")
      } else {
        console.log(
          `[step 3] Отделов без руководителя: ${headlessDepartments.length}. Поиск кандидатов…`
        )

        for (const dept of headlessDepartments) {
          const priorityOrder = sql`CASE
            WHEN ${employeeProfiles.positionTitle} ILIKE '%директор%' THEN 1
            WHEN ${employeeProfiles.positionTitle} ILIKE '%руководитель%' THEN 2
            WHEN ${employeeProfiles.positionTitle} ILIKE '%начальник%' THEN 3
            ELSE 4 END`

          const [candidate] = await tx
            .select({
              userId: users.id,
              positionTitle: employeeProfiles.positionTitle,
            })
            .from(users)
            .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
            .where(
              and(
                eq(users.departmentId, dept.id),
                eq(users.isActive, true),
                or(
                  ilike(employeeProfiles.positionTitle, "%директор%"),
                  ilike(employeeProfiles.positionTitle, "%руководитель%"),
                  ilike(employeeProfiles.positionTitle, "%начальник%")
                )
              )
            )
            .orderBy(
              priorityOrder,
              asc(sql`COALESCE(${employeeProfiles.startDate}, current_date)`),
              asc(users.lastName)
            )
            .limit(1)

          if (!candidate) {
            summary.skippedHeads += 1
            console.log(
              `[step 3]   "${dept.name}" — подходящий руководитель не найден`
            )
            continue
          }

          await tx
            .update(departments)
            .set({ headUserId: candidate.userId })
            .where(eq(departments.id, dept.id))
          summary.assignedHeads += 1
          console.log(
            `[step 3]   "${dept.name}" — назначен руководитель (${candidate.positionTitle ?? "должность не указана"})`
          )
        }
      }

      // ── Step 4. Удалить тестовые новости с TRIM(title) = 'Т'
      const newsCondition = sql`trim(${news.title}) = ${TEST_NEWS_TITLE}`
      const testNews = await tx
        .select({ id: news.id })
        .from(news)
        .where(newsCondition)

      if (testNews.length === 0) {
        console.log("[step 4] Тестовых новостей 'Т' не найдено — пропускаем")
      } else {
        const deletedNews = await tx
          .delete(news)
          .where(newsCondition)
          .returning({ id: news.id })
        summary.deletedTestNews = deletedNews.length
        console.log(`[step 4] Удалено тестовых новостей: ${deletedNews.length}`)
      }
    })

    console.log("\n=== СВОДКА ===")
    console.log(`Удалено отделов '${GARBAGE_DEPARTMENT_NAME}': ${summary.deletedGarbageDepartments}`)
    console.log(`Сотрудников без отдела (отчёт): ${summary.orphansCount}`)
    console.log(`Назначено руководителей отделов: ${summary.assignedHeads}`)
    console.log(`Отделов без подходящего кандидата: ${summary.skippedHeads}`)
    console.log(`Удалено тестовых новостей '${TEST_NEWS_TITLE}': ${summary.deletedTestNews}`)
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Неизвестная ошибка"
  console.error(`Ошибка очистки данных: ${message}`)
  process.exit(1)
})
