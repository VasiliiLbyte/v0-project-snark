"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Employee } from "@/types/portal"

interface EmployeePickerProps {
  employees: Employee[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  allowEmpty?: boolean
  disabled?: boolean
}

export function EmployeePicker({
  employees,
  value,
  onChange,
  placeholder = "Выберите сотрудника",
  allowEmpty = true,
  disabled = false,
}: EmployeePickerProps) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(next) => onChange(next === "__none__" ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value="__none__">Не назначен</SelectItem> : null}
        {employees.map((employee) => (
          <SelectItem key={employee.userId} value={employee.userId}>
            {employee.name}
            {employee.position ? ` · ${employee.position}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
