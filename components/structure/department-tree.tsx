'use client'

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { DepartmentTreeNode } from "@/types/portal"

interface DepartmentTreeProps {
  nodes: DepartmentTreeNode[]
}

export function DepartmentTree({ nodes }: DepartmentTreeProps) {
  return (
    <ul role="tree" aria-label="Оргструктура компании" className="space-y-3">
      {nodes.map((node) => (
        <DepartmentTreeNodeView key={node.id} node={node} depth={0} />
      ))}
    </ul>
  )
}

interface NodeViewProps {
  node: DepartmentTreeNode
  depth: number
}

function DepartmentTreeNodeView({ node, depth }: NodeViewProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const contactsHref = `/contacts?department=${encodeURIComponent(node.name)}`

  return (
    <li
      role="treeitem"
      aria-selected={false}
      aria-expanded={hasChildren ? expanded : undefined}
      className={cn(
        "relative",
        depth > 0 && [
          "md:before:absolute md:before:left-[-1.5rem] md:before:top-6 md:before:h-px md:before:w-6 md:before:bg-border",
        ],
      )}
    >
      <DepartmentCard
        node={node}
        contactsHref={contactsHref}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      {hasChildren && expanded ? (
        <ul
          role="group"
          className={cn(
            "mt-3 space-y-3",
            "md:ml-6 md:border-l md:border-border md:pl-6",
          )}
        >
          {node.children.map((child) => (
            <DepartmentTreeNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface CardProps {
  node: DepartmentTreeNode
  contactsHref: string
  hasChildren: boolean
  expanded: boolean
  onToggle: () => void
}

function DepartmentCard({ node, contactsHref, hasChildren, expanded, onToggle }: CardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={contactsHref}
        className="flex flex-1 flex-col gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
        aria-label={`Открыть сотрудников подразделения «${node.name}»`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{node.name}</h3>
            {node.code ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {node.code}
              </span>
            ) : null}
          </div>
          {node.description ? (
            <p className="text-sm text-muted-foreground">{node.description}</p>
          ) : null}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pluralEmployees(node.employeeCount)}</span>
          </div>
        </div>

        {node.head ? <DepartmentHeadBadge head={node.head} /> : null}
      </Link>

      {hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          aria-label={expanded ? "Свернуть подразделение" : "Развернуть подразделение"}
          aria-expanded={expanded}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-90")}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  )
}

function DepartmentHeadBadge({ head }: { head: NonNullable<DepartmentTreeNode["head"]> }) {
  const initials = head.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 sm:max-w-[260px]">
      <Avatar className="size-8 shrink-0">
        {head.avatarUrl ? <AvatarImage src={head.avatarUrl} alt={head.fullName} /> : null}
        <AvatarFallback className="text-xs font-medium">{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{head.fullName}</div>
        {head.positionTitle ? (
          <div className="truncate text-xs text-muted-foreground">{head.positionTitle}</div>
        ) : null}
      </div>
    </div>
  )
}

function pluralEmployees(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} сотрудник`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} сотрудника`
  return `${count} сотрудников`
}
