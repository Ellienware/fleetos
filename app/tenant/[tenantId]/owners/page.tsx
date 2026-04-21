"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Owner, MembershipStatus } from "@/types"
import { getOwnersAction, deleteOwnerAction } from "../actions"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getMembershipNumber(owner: Owner): string {
  return owner.idNumber.slice(-6) || owner.$id.slice(-6)
}

const AVATAR_COLORS = [
  "bg-blue-50   text-blue-800   dark:bg-blue-950   dark:text-blue-200",
  "bg-teal-50   text-teal-800   dark:bg-teal-950   dark:text-teal-200",
  "bg-amber-50  text-amber-800  dark:bg-amber-950  dark:text-amber-200",
  "bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
] as const

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]
}

// ---------------------------------------------------------------------------
// Status pill — identical pattern to vehicles StatusPill
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, { dot: string; pill: string; label: string }> = {
  active: {
    dot:   "bg-green-600",
    pill:  "bg-green-50  text-green-900  dark:bg-green-950 dark:text-green-100",
    label: "Active",
  },
  suspended: {
    dot:   "bg-red-600",
    pill:  "bg-red-50    text-red-900    dark:bg-red-950   dark:text-red-100",
    label: "Suspended",
  },
  pending: {
    dot:   "bg-amber-500",
    pill:  "bg-amber-50  text-amber-900  dark:bg-amber-950 dark:text-amber-100",
    label: "Pending",
  },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? {
    dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground", label: status,
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.pill)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function OwnerAvatar({ owner }: { owner: Owner }) {
  return (
    <div className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
      avatarColor(owner.$id)
    )}>
      {getInitials(owner.firstName, owner.lastName)}
    </div>
  )
}

function StatCard({ label, value, valueClass, icon }: {
  label: string; value: number | null; valueClass?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {value === null
        ? <Skeleton className="h-7 w-10" />
        : <div className={cn("text-2xl font-semibold leading-none tabular-nums", valueClass)}>{value}</div>
      }
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OwnersPage() {
  const params   = useParams()
  const tenantId = params.tenantId as string

  const [searchQuery, setSearchQuery]   = useState("")
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "all">("all")
  const [owners, setOwners]             = useState<Owner[]>([])
  const [total, setTotal]               = useState(0)
  const [isLoading, setIsLoading]       = useState(true)
  const [isPending, startTransition]    = useTransition()
  const [deleteId, setDeleteId]         = useState<string | null>(null)

  useEffect(() => {
    async function fetchOwners() {
      setIsLoading(true)
      try {
        const status = statusFilter === "all" ? undefined : statusFilter
        const result = await getOwnersAction(tenantId, 1, 100, status)
        if (result.success && result.data) {
          setOwners(result.data.documents)
          setTotal(result.data.total)
        } else {
          toast.error(result.error || "Failed to fetch owners")
        }
      } catch {
        toast.error("Failed to fetch owners")
      } finally {
        setIsLoading(false)
      }
    }
    fetchOwners()
  }, [tenantId, statusFilter])

  const filteredOwners = owners.filter((owner) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      `${owner.firstName} ${owner.lastName}`.toLowerCase().includes(q) ||
      owner.email.toLowerCase().includes(q) ||
      owner.idNumber.includes(q) ||
      getMembershipNumber(owner).toLowerCase().includes(q)
    )
  })

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        const result = await deleteOwnerAction(tenantId, deleteId)
        if (result.success) {
          setOwners((prev) => prev.filter((o) => o.$id !== deleteId))
          setTotal((prev) => prev - 1)
          toast.success("Owner deleted successfully")
        } else {
          toast.error(result.error || "Failed to delete owner")
        }
      } catch {
        toast.error("Failed to delete owner")
      } finally {
        setDeleteId(null)
      }
    })
  }

  const stats = {
    total,
    active:    owners.filter((o) => o.membershipStatus === "active").length,
    suspended: owners.filter((o) => o.membershipStatus === "suspended").length,
    pending:   owners.filter((o) => o.membershipStatus === "pending").length,
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Owners</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage taxi owners and their memberships
          </p>
        </div>
        <Link href={`/tenant/${tenantId}/owners/new`}>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Plus className="h-3.5 w-3.5" />
            Add owner
          </button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total owners"
          value={isLoading ? null : stats.total}
          icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active"
          value={isLoading ? null : stats.active}
          valueClass="text-green-700 dark:text-green-400"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
        <StatCard
          label="Suspended"
          value={isLoading ? null : stats.suspended}
          valueClass="text-red-700 dark:text-red-400"
          icon={<AlertCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />}
        />
        <StatCard
          label="Pending"
          value={isLoading ? null : stats.pending}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
      </div>

      {/* Directory table card — same structure as vehicles */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Owner directory</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all registered taxi owners</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MembershipStatus | "all")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredOwners.length} owner{filteredOwners.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Owner", "Membership", "Contact", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {owners.length === 0
                      ? "No owners registered yet. Add your first owner to get started."
                      : "No owners match your search."}
                  </td>
                </tr>
              ) : (
                filteredOwners.map((owner) => (
                  <tr key={owner.$id} className="transition-colors hover:bg-muted/30">

                    {/* Owner */}
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <OwnerAvatar owner={owner} />
                        <div>
                          <p className="font-medium leading-tight">{owner.firstName} {owner.lastName}</p>
                          <p className="text-xs text-muted-foreground">ID: {owner.idNumber.slice(0, 6)}…</p>
                        </div>
                      </div>
                    </td>

                    {/* Membership */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-medium">{getMembershipNumber(owner)}</p>
                      <p className="text-xs text-muted-foreground">
                        Since {new Date(owner.joinedAt).toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {owner.phone}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        {owner.email}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusPill status={owner.membershipStatus} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/tenant/${tenantId}/owners/${owner.$id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tenant/${tenantId}/owners/${owner.$id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit owner
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(owner.$id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete owner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete owner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this owner? This action cannot be undone. All associated vehicles and records will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
                : "Delete"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}