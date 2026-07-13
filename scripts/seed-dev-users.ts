import { config } from "dotenv"
config({ path: ".env.local" })
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { employeeProfiles, users } from "@/lib/db/schema"

const MIN_SALT_ROUNDS = 12

interface UserSeed {
  email: string
  password: string
  firstName: string
  lastName: string
  role: "admin" | "hr_manager" | "employee"
  positionTitle: string
  phone?: string
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Не задан ${name}. Укажите пароли в .env.local (см. .env.example). Пароли не хранятся в репозитории.`
    )
  }
  return value
}

function buildSeeds(): UserSeed[] {
  return [
    {
      email: process.env.DEV_ADMIN_EMAIL?.trim() || "admin@snark.ru",
      password: requireEnv("DEV_ADMIN_PASSWORD"),
      firstName: "Админ",
      lastName: "Тест",
      role: "admin",
      positionTitle: "Администратор системы",
    },
    {
      email: process.env.DEV_HR_EMAIL?.trim() || "hr@snark.ru",
      password: requireEnv("DEV_HR_PASSWORD"),
      firstName: "Анна",
      lastName: "Петрова",
      role: "hr_manager",
      positionTitle: "HR менеджер",
      phone: "+7 (900) 000-00-01",
    },
    {
      email: process.env.DEV_EMPLOYEE_EMAIL?.trim() || "employee@snark.ru",
      password: requireEnv("DEV_EMPLOYEE_PASSWORD"),
      firstName: "Иван",
      lastName: "Сидоров",
      role: "employee",
      positionTitle: "Специалист",
      phone: "+7 (900) 000-00-02",
    },
  ]
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL не задан")

  const seeds = buildSeeds()
  const pool = new Pool({ connectionString })
  const db = drizzle(pool)
  let created = 0
  let updated = 0

  try {
    for (const u of seeds) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, u.email.toLowerCase()))
        .limit(1)

      const passwordHash = await bcrypt.hash(u.password, MIN_SALT_ROUNDS)

      if (existing) {
        await db
          .update(users)
          .set({
            firstName: u.firstName,
            lastName: u.lastName,
            passwordHash,
            role: u.role,
            updatedAt: new Date(),
          })
          .where(eq(users.email, u.email.toLowerCase()))
        console.log(`Обновлён: ${u.email}`)
        updated++
        continue
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email: u.email.toLowerCase(),
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: true,
        })
        .returning({ id: users.id })

      if (newUser) {
        await db.insert(employeeProfiles).values({
          userId: newUser.id,
          positionTitle: u.positionTitle,
          phone: u.phone ?? null,
          presence: "office",
          updatedAt: new Date(),
        })
        console.log(`Создан [${u.role}]: ${u.email}`)
        created++
      }
    }
  } finally {
    await pool.end()
  }

  console.log(`\nИтого: создано ${created}, обновлено ${updated}`)
  console.log("Пароли взяты из .env.local — не коммитьте их в git.")
}

main().catch((err) => {
  console.error("Ошибка:", err instanceof Error ? err.message : err)
  process.exit(1)
})
