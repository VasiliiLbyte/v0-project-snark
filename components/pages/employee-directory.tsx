'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Phone, Mail, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ContactsData } from '@/types/portal'

type EmployeeStatus = 'online' | 'away' | 'offline'

function statusLabel(status: EmployeeStatus): string {
  if (status === 'online') return 'В офисе'
  if (status === 'away') return 'Отошёл'
  return 'Не в сети'
}

function statusDotColor(status: EmployeeStatus): string {
  if (status === 'online') return 'bg-success'
  if (status === 'away') return 'bg-accent'
  return 'bg-muted-foreground'
}

export function EmployeeDirectory({ data }: { data: ContactsData }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('Все')

  const filteredEmployees = data.employees.filter((emp) => {
    const matchesSearch = emp.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesDepartment =
      selectedDepartment === 'Все' || emp.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-primary">
          Справочник сотрудников
        </h1>
        <p className="mt-2 text-muted-foreground">
          Всего в организации {data.employees.length} сотрудников
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или должности..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {data.departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                  selectedDepartment === dept
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-border'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Employees List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((emp) => (
          <Card
            key={emp.id}
            className="relative p-6 transition-shadow hover:shadow-lg"
          >
            <Link
              href={`/contacts/${emp.userId}`}
              aria-label={`Открыть карточку сотрудника ${emp.name}`}
              className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="pointer-events-none relative z-10">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {emp.avatar}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 h-4 w-4 rounded-full ring-2 ring-card ${statusDotColor(emp.status)}`}
                      title={statusLabel(emp.status)}
                      aria-label={statusLabel(emp.status)}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-card-foreground">
                      {emp.name}
                    </h3>
                    <p className="text-sm text-secondary">{emp.position}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Отдел</p>
                  <p className="font-medium text-foreground">{emp.department}</p>
                </div>

                {emp.phone && emp.phone !== 'Не указан' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    <a
                      href={`tel:${emp.phone}`}
                      className="pointer-events-auto relative hover:text-primary"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {emp.phone}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <a
                    href={`mailto:${emp.email}`}
                    className="pointer-events-auto relative hover:text-primary"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {emp.email}
                  </a>
                </div>

                {emp.office && emp.office !== 'Не указан' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>{emp.office}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${statusDotColor(emp.status)}`}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{statusLabel(emp.status)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-lg text-muted-foreground">
            Сотрудники не найдены
          </p>
        </Card>
      )}
    </div>
  )
}
