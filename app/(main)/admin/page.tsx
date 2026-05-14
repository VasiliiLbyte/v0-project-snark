import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-card-foreground">Панель администратора</h1>
        <p className="mt-3 text-muted-foreground">
          Раздел доступен только пользователям с ролью admin или hr_manager.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Сотрудники</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Импорт сотрудников из Excel, редактирование карточек и управление видимостью.
          </p>
          <div className="mt-4">
            <Link href="/admin/employees">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Новости</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Создание, публикация и редактирование новостей корпоративного портала.
          </p>
          <div className="mt-4">
            <Link href="/admin/news">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Заявки</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Список всех заявок сотрудников: ИТ, АХО, HR. Можно взять заявку в работу одной кнопкой.
          </p>
          <div className="mt-4">
            <Link href="/admin/tickets">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Отпуска</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Согласование заявок сотрудников на отпуск: утверждение или отклонение с комментарием.
          </p>
          <div className="mt-4">
            <Link href="/admin/vacations">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">База знаний</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Создание и публикация статей корпоративной базы знаний с категориями и тегами.
          </p>
          <div className="mt-4">
            <Link href="/admin/knowledge">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Подразделения</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Иерархия подразделений, руководители и контакты для справочника компании.
          </p>
          <div className="mt-4">
            <Link href="/admin/departments">
              <Button className="bg-[#16223b] hover:bg-[#16223b]/90">Открыть раздел</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
