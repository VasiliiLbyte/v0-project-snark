import { Building2 } from "lucide-react"
import { DepartmentTree } from "@/components/structure/department-tree"
import { loadDepartmentsTree } from "@/lib/portal-data/loaders"

export const metadata = {
  title: "Оргструктура",
}

export default async function StructurePage() {
  const { departments } = await loadDepartmentsTree()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Оргструктура компании</h1>
        <p className="text-sm text-muted-foreground">
          Подразделения, руководители и численность сотрудников
        </p>
      </header>

      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <Building2 className="mb-3 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Структура пока не настроена</p>
        </div>
      ) : (
        <DepartmentTree nodes={departments} />
      )}
    </div>
  )
}
