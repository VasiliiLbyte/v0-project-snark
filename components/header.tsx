"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Menu, ChevronDown, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { UserRole } from "@/types/auth"

interface HeaderProps {
  onMenuClick?: () => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Администратор",
  hr_manager: "HR-менеджер",
  employee: "Сотрудник",
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      router.replace("/login")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "..."

  const roleLabel = user ? ROLE_LABELS[user.role] ?? user.role : ""


  return (
    <header className="sticky top-0 z-50 h-16 bg-primary">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: Logo and mobile menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-primary-foreground hover:bg-secondary md:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <span className="text-lg font-bold text-white">С</span>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-white">СНАРК</h1>
              <p className="text-xs text-white/70">Корпоративный портал</p>
            </div>
          </div>
        </div>
        
        {/* Right: User profile + logout */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* User profile */}
          <button className="flex items-center gap-2 rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 md:px-3 md:py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-white/70">{roleLabel}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 opacity-70 md:block" />
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            aria-label="Выйти из аккаунта"
            className="flex items-center gap-2 rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden text-sm font-medium md:inline">
              {isLoggingOut ? "Выход..." : "Выйти"}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
