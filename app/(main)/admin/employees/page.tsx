"use client"

import { useEffect, useMemo, useState } from "react"
import { EmployeeImport } from "@/components/admin/employee-import"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type {
  AdminDepartmentItem,
  AdminEmployeeItem,
  AdminEmployeeUpsertPayload,
} from "@/types/portal"

type SheetMode = "create" | "edit"

type ActiveStatus = "office" | "remote" | "vacation"

type AdminEmployeeForm = {
  lastName: string
  firstName: string
  middleName: string
  positionTitle: string
  departmentName: string
  phone: string
  email: string
  birthDate: string
  startDate: string
  inn: string
  snils: string
  address: string
  citizenship: string
  education: string
  managerPosition: string
  contractEndDate: string
  professions: string
  anniversaryYears: string
  isContractor: boolean
  status: ActiveStatus
  isNewEmployee: boolean
  welcomeNote: string
}

const DEFAULT_FORM: AdminEmployeeForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  positionTitle: "",
  departmentName: "",
  phone: "",
  email: "",
  birthDate: "",
  startDate: "",
  inn: "",
  snils: "",
  address: "",
  citizenship: "",
  education: "",
  managerPosition: "",
  contractEndDate: "",
  professions: "",
  anniversaryYears: "",
  isContractor: false,
  status: "office",
  isNewEmployee: false,
  welcomeNote: "",
}

function formatBirthdayPublic(date?: string | null): string {
  if (!date) return "-"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "-"
  const day = String(parsed.getDate()).padStart(2, "0")
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const year = parsed.getFullYear()
  return `${day}.${month}.${year}`
}

function statusLabel(status: AdminEmployeeItem["status"]): string {
  if (status === "active") return "В офисе"
  if (status === "vacation") return "В отпуске"
  if (status === "remote") return "Удалённо"
  return "Скрыт"
}

function activeStatusFromItem(status: AdminEmployeeItem["status"]): ActiveStatus {
  if (status === "vacation") return "vacation"
  if (status === "remote") return "remote"
  return "office"
}

function activeStatusToPayload(status: ActiveStatus): AdminEmployeeUpsertPayload["status"] {
  if (status === "vacation") return "vacation"
  if (status === "remote") return "remote"
  return "active"
}

export default function AdminEmployeesPage() {
  const [items, setItems] = useState<AdminEmployeeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminEmployeeForm>(DEFAULT_FORM)
  const [departments, setDepartments] = useState<AdminDepartmentItem[]>([])

  const pageTitle = useMemo(
    () => (sheetMode === "create" ? "Добавить сотрудника" : "Редактировать сотрудника"),
    [sheetMode]
  )

  const loadEmployees = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" })
      const body = (await response.json()) as { items?: AdminEmployeeItem[]; error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось загрузить сотрудников.")
        return
      }
      setItems(body.items ?? [])
    } catch {
      setError("Ошибка сети при загрузке сотрудников.")
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments", { cache: "no-store" })
      if (!response.ok) return
      const body = (await response.json()) as { items?: AdminDepartmentItem[] }
      setDepartments(body.items ?? [])
    } catch {
      // Silent — поле «Подразделение» останется с одним пунктом «Без отдела».
    }
  }

  useEffect(() => {
    void loadEmployees()
    void loadDepartments()
  }, [])

  const openCreateSheet = () => {
    setSheetMode("create")
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setSheetOpen(true)
  }

  const openEditSheet = (item: AdminEmployeeItem) => {
    const parts = item.fullName.trim().split(/\s+/)
    setSheetMode("edit")
    setEditingId(item.id)
    setForm({
      lastName: parts[0] ?? item.lastName ?? "",
      firstName: parts[1] ?? item.firstName ?? "",
      middleName: parts.slice(2).join(" ") || item.middleName || "",
      positionTitle: item.positionTitle,
      departmentName: item.departmentName,
      phone: item.phone ?? "",
      email: item.email,
      birthDate: item.birthDate ?? "",
      startDate: item.startDate ?? "",
      inn: item.inn ?? "",
      snils: item.snils ?? "",
      address: item.address ?? "",
      citizenship: item.citizenship ?? "",
      education: item.education ?? "",
      managerPosition: item.managerPosition ?? "",
      contractEndDate: item.contractEndDate ?? "",
      professions: item.professions ?? "",
      anniversaryYears: item.anniversaryYears != null ? String(item.anniversaryYears) : "",
      isContractor: item.isContractor,
      status: activeStatusFromItem(item.status),
      isNewEmployee: item.isNew || Boolean(item.welcomeNote),
      welcomeNote: item.welcomeNote ?? "",
    })
    setSheetOpen(true)
  }

  const handleSubmit = async () => {
    setError(null)

    const fullName = [form.lastName, form.firstName, form.middleName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ")

    if (!fullName || !form.positionTitle.trim()) {
      setError("Заполните ФИО и должность.")
      return
    }

    const anniversaryYearsNumber = form.anniversaryYears.trim()
      ? Number.parseInt(form.anniversaryYears, 10)
      : undefined

    const payload: AdminEmployeeUpsertPayload = {
      fullName,
      positionTitle: form.positionTitle.trim(),
      departmentName: form.departmentName.trim(),
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      birthDate: form.birthDate?.trim() || undefined,
      startDate: form.startDate?.trim() || undefined,
      welcomeNote: form.isNewEmployee ? form.welcomeNote?.trim() || undefined : "",
      status: activeStatusToPayload(form.status),
      inn: form.inn?.trim() || undefined,
      snils: form.snils?.trim() || undefined,
      address: form.address?.trim() || undefined,
      citizenship: form.citizenship?.trim() || undefined,
      education: form.education?.trim() || undefined,
      managerPosition: form.managerPosition?.trim() || undefined,
      contractEndDate: form.contractEndDate?.trim() || undefined,
      professions: form.professions?.trim() || undefined,
      anniversaryYears:
        anniversaryYearsNumber !== undefined && Number.isFinite(anniversaryYearsNumber)
          ? anniversaryYearsNumber
          : undefined,
      isContractor: form.isContractor,
    }

    const url = sheetMode === "create" ? "/api/admin/employees" : `/api/admin/employees/${editingId}`
    const method = sheetMode === "create" ? "POST" : "PUT"

    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось сохранить сотрудника.")
        return
      }
      setSheetOpen(false)
      await loadEmployees()
    } catch {
      setError("Ошибка сети при сохранении сотрудника.")
    }
  }

  const handleHide = async (id: string, hidden: boolean) => {
    setError(null)
    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hidden }),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось изменить видимость сотрудника.")
        return
      }
      await loadEmployees()
    } catch {
      setError("Ошибка сети при изменении видимости.")
    }
  }

  const handleDelete = async (id: string, fullName: string) => {
    const confirmed = window.confirm(`Удалить сотрудника "${fullName}" навсегда?\nЭто действие нельзя отменить.`)
    if (!confirmed) return

    setError(null)
    try {
      const response = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось удалить сотрудника.")
        return
      }
      await loadEmployees()
    } catch {
      setError("Ошибка сети при удалении сотрудника.")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Сотрудники</h1>
            <p className="text-sm text-muted-foreground">Управление кадровым списком и импорт из Excel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              Импорт из Excel
            </Button>
            <Button className="bg-[#16223b] hover:bg-[#16223b]/90" onClick={openCreateSheet}>
              Добавить сотрудника
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">ФИО</TableHead>
                <TableHead className="w-[180px]">Отдел</TableHead>
                <TableHead className="w-[180px]">Должность</TableHead>
                <TableHead className="w-[110px]">Дата рождения</TableHead>
                <TableHead className="w-[110px]">Статус</TableHead>
                <TableHead className="w-[100px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal break-words" title={item.fullName}>
                    <div className="font-medium">{item.fullName}</div>
                    {item.isNew && (
                      <Badge variant="secondary" className="mt-1">
                        Новый
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate" title={item.departmentName}>
                    {item.departmentName}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate" title={item.positionTitle}>
                    {item.positionTitle}
                  </TableCell>
                  <TableCell>{formatBirthdayPublic(item.birthDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs">
                          Действия
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(item)}>Редактировать</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleHide(item.id, item.isActive)}>
                          {item.isActive ? "Скрыть" : "Показать"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(item.id, item.fullName)}
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Здесь пока нет сотрудников.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Импорт сотрудников из Excel</DialogTitle>
            <DialogDescription>
              Загрузите .xlsx по корпоративному шаблону. Идентификация — по ФИО.
            </DialogDescription>
          </DialogHeader>
          <EmployeeImport
            onImported={() => {
              void loadEmployees()
            }}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{pageTitle}</SheetTitle>
            <SheetDescription>Заполните поля сотрудника и сохраните изменения.</SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 px-4 pb-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">ФИО</h3>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Фамилия <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Иванов"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Имя <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Иван"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">
                    Отчество <span className="text-muted-foreground text-xs">(необязательно)</span>
                  </Label>
                  <Input
                    id="middleName"
                    value={form.middleName}
                    onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
                    placeholder="Иванович"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">Работа</h3>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="departmentName">Подразделение</Label>
                  <Select
                    value={form.departmentName === "" ? "__none__" : form.departmentName}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        departmentName: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger id="departmentName" className="w-full">
                      <SelectValue placeholder="— Без отдела —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Без отдела —</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="positionTitle">
                    Должность <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="positionTitle"
                    value={form.positionTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, positionTitle: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerPosition">Должность руководителя подразделения</Label>
                  <Input
                    id="managerPosition"
                    value={form.managerPosition}
                    onChange={(event) => setForm((prev) => ({ ...prev, managerPosition: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Дата приёма</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractEndDate">Дата окончания договора</Label>
                    <Input
                      id="contractEndDate"
                      type="date"
                      value={form.contractEndDate ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, contractEndDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Label htmlFor="isContractor">Оформлен по трудовому договору</Label>
                    <p className="text-xs text-muted-foreground">Снимите, если сотрудник работает по ГПХ.</p>
                  </div>
                  <Switch
                    id="isContractor"
                    checked={form.isContractor}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isContractor: Boolean(checked) }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">Контакты</h3>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="name@almacorgroup.ru"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">Личные данные</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Дата рождения</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="citizenship">Гражданство</Label>
                    <Input
                      id="citizenship"
                      value={form.citizenship}
                      onChange={(event) => setForm((prev) => ({ ...prev, citizenship: event.target.value }))}
                      placeholder="РФ"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="inn">ИНН</Label>
                    <Input
                      id="inn"
                      value={form.inn}
                      onChange={(event) => setForm((prev) => ({ ...prev, inn: event.target.value }))}
                      placeholder="12 цифр"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snils">СНИЛС</Label>
                    <Input
                      id="snils"
                      value={form.snils}
                      onChange={(event) => setForm((prev) => ({ ...prev, snils: event.target.value }))}
                      placeholder="XXX-XXX-XXX XX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Адрес проживания</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Образование</Label>
                  <Input
                    id="education"
                    value={form.education}
                    onChange={(event) => setForm((prev) => ({ ...prev, education: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professions">Профессии</Label>
                  <Input
                    id="professions"
                    value={form.professions}
                    onChange={(event) => setForm((prev) => ({ ...prev, professions: event.target.value }))}
                    placeholder="Через запятую"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anniversaryYears">Юбилей (лет)</Label>
                  <Input
                    id="anniversaryYears"
                    type="number"
                    min={0}
                    max={150}
                    value={form.anniversaryYears}
                    onChange={(event) => setForm((prev) => ({ ...prev, anniversaryYears: event.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">Статус</h3>
              <div className="space-y-2">
                <Label htmlFor="status">Текущий статус</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: ActiveStatus) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">В офисе</SelectItem>
                    <SelectItem value="remote">На удалёнке</SelectItem>
                    <SelectItem value="vacation">В отпуске</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-card-foreground">Приветствие новому сотруднику</h3>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="isNewEmployee">Новый сотрудник</Label>
                  <p className="text-xs text-muted-foreground">
                    Покажет приветственный блок и пометку «Новый» на портале.
                  </p>
                </div>
                <Switch
                  id="isNewEmployee"
                  checked={form.isNewEmployee}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isNewEmployee: Boolean(checked) }))}
                />
              </div>
              {form.isNewEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="welcomeNote">Приветственный текст от HR</Label>
                  <Textarea
                    id="welcomeNote"
                    value={form.welcomeNote}
                    onChange={(event) => setForm((prev) => ({ ...prev, welcomeNote: event.target.value }))}
                    placeholder="Добро пожаловать в команду! Мы рады видеть Вас..."
                    rows={4}
                  />
                </div>
              )}
            </section>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Отмена
            </Button>
            <Button type="button" className="bg-[#16223b] hover:bg-[#16223b]/90" onClick={handleSubmit}>
              Сохранить
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
