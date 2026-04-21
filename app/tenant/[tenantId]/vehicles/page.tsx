"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Car,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Vehicle, VehicleStatus } from "@/types";
import {
  getVehiclesAction,
  deleteVehicleAction,
  approveVehicleAction,
  rejectVehicleAction,
} from "../actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

type DialogAction = "delete" | "approve" | "reject";
interface DialogState { id: string; action: DialogAction }

const DIALOG_CONFIG: Record<DialogAction, {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  confirmClass: string;
}> = {
  delete: {
    title: "Remove vehicle",
    description: "Are you sure you want to remove this vehicle? This action cannot be undone.",
    confirmLabel: "Remove",
    pendingLabel: "Removing…",
    confirmClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  approve: {
    title: "Approve vehicle",
    description: "The vehicle will become active and can be assigned to routes.",
    confirmLabel: "Approve",
    pendingLabel: "Approving…",
    confirmClass: "bg-green-600 text-white hover:bg-green-700",
  },
  reject: {
    title: "Reject vehicle",
    description: "The vehicle registration will be removed. The owner will need to resubmit.",
    confirmLabel: "Reject",
    pendingLabel: "Rejecting…",
    confirmClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpiringSoon(dateString: string | undefined): boolean {
  if (!dateString) return false;
  const d = Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000);
  return d <= 30 && d > 0;
}

function isExpired(dateString: string | undefined): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const STATUS_STRIPE: Record<VehicleStatus, string> = {
  active: "border-l-[3px] border-l-green-600",
  inactive: "border-l-[3px] border-l-red-600",
  maintenance: "border-l-[3px] border-l-amber-500",
  pending: "border-l-[3px] border-l-blue-500",
};

const STATUS_BADGE: Record<VehicleStatus, { dot: string; pill: string; label: string }> = {
  active:      { dot: "bg-green-600",  pill: "bg-green-50  text-green-900  dark:bg-green-950 dark:text-green-100",  label: "Active" },
  inactive:    { dot: "bg-red-600",    pill: "bg-red-50    text-red-900    dark:bg-red-950   dark:text-red-100",    label: "Inactive" },
  maintenance: { dot: "bg-amber-500",  pill: "bg-amber-50  text-amber-900  dark:bg-amber-950 dark:text-amber-100",  label: "Maintenance" },
  pending:     { dot: "bg-blue-500",   pill: "bg-blue-50   text-blue-900   dark:bg-blue-950  dark:text-blue-100",   label: "Pending" },
};

function StatusPill({ status }: { status: VehicleStatus }) {
  const s = STATUS_BADGE[status] ?? { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function ComplianceCell({ permitExpiry, insuranceExpiry }: { permitExpiry?: string; insuranceExpiry?: string }) {
  const permitExpired   = isExpired(permitExpiry);
  const permitSoon      = isExpiringSoon(permitExpiry);
  const insExpired      = isExpired(insuranceExpiry);
  const insSoon         = isExpiringSoon(insuranceExpiry);
  const allGood         = !permitExpired && !permitSoon && !insExpired && !insSoon;

  return (
    <div className="flex flex-col gap-1">
      {allGood && <CompPill variant="ok"      label="Compliant" />}
      {permitExpired     && <CompPill variant="bad"  label="Permit expired" />}
      {permitSoon && !permitExpired && <CompPill variant="warn" label="Permit expiring" />}
      {insExpired        && <CompPill variant="bad"  label="Insurance expired" />}
      {insSoon && !insExpired       && <CompPill variant="warn" label="Insurance expiring" />}
    </div>
  );
}

function CompPill({ variant, label }: { variant: "ok" | "warn" | "bad"; label: string }) {
  const styles = {
    ok:   "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
    warn: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
    bad:  "bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",
  };
  const mark = variant === "ok" ? "✓" : variant === "warn" ? "⚠" : "✕";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", styles[variant])}>
      <span className="text-[10px]">{mark}</span>
      {label}
    </span>
  );
}

function MonoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tracking-wider text-foreground">
      {children}
    </span>
  );
}

function StatCard({ label, value, valueClass, icon }: {
  label: string;
  value: number | null;
  valueClass?: string;
  icon?: React.ReactNode;
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
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-l-[3px] border-l-transparent">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VehiclesPage() {
  const params     = useParams();
  const tenantId   = params.tenantId as string;
  const router     = useRouter();
  const searchParams = useSearchParams();

  const currentPage   = Number(searchParams.get("page") ?? "1");
  const searchQuery   = searchParams.get("q") ?? "";
  const statusFilter  = (searchParams.get("status") as VehicleStatus | "all") ?? "all";

  const [inputValue, setInputValue] = useState(searchQuery);
  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [total, setTotal]           = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [dialog, setDialog]         = useState<DialogState | null>(null);

  const [pendingDelete,  startDelete]  = useTransition();
  const [pendingApprove, startApprove] = useTransition();
  const [pendingReject,  startReject]  = useTransition();

  const isPending =
    dialog?.action === "delete"  ? pendingDelete  :
    dialog?.action === "approve" ? pendingApprove : pendingReject;

  // URL helpers
  const pushParams = useCallback((updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === "all" || v === "1") p.delete(k);
      else p.set(k, v);
    }
    router.push(`?${p.toString()}`);
  }, [router, searchParams]);

  // Debounce search → URL
  useEffect(() => {
    const t = setTimeout(() => pushParams({ q: inputValue, page: "1" }), 350);
    return () => clearTimeout(t);
  }, [inputValue]);


  useEffect(() => {
    async function fetchVehicles() {
      setIsLoading(true);
      try {
        const status = statusFilter === "all" ? undefined : statusFilter;
        const result = await getVehiclesAction(tenantId, currentPage, PAGE_SIZE, status);
        if (result.success && result.data) {
          setVehicles(result.data.documents);
          setTotal(result.data.total);
        } else {
          toast.error(result.error || "Failed to fetch vehicles");
        }
      } catch {
        toast.error("Failed to fetch vehicles");
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicles();
  }, [tenantId, currentPage, statusFilter, searchQuery]);

  // Mutations
  const handleConfirm = () => {
    if (!dialog) return;
    const { id, action } = dialog;

    if (action === "delete") {
      startDelete(async () => {
        try {
          const result = await deleteVehicleAction(tenantId, id);
          if (result.success) {
            setVehicles(prev => prev.filter(v => v.$id !== id));
            setTotal(prev => prev - 1);
            toast.success("Vehicle removed successfully");
          } else toast.error(result.error || "Failed to remove vehicle");
        } catch { toast.error("Failed to remove vehicle"); }
        finally { setDialog(null); }
      });
    } else if (action === "approve") {
      startApprove(async () => {
        try {
          const result = await approveVehicleAction(tenantId, id);
          if (result.success) {
            setVehicles(prev => prev.map(v => v.$id === id ? { ...v, status: "active" as VehicleStatus } : v));
            toast.success("Vehicle approved successfully");
          } else toast.error(result.error || "Failed to approve vehicle");
        } catch { toast.error("Failed to approve vehicle"); }
        finally { setDialog(null); }
      });
    } else {
      startReject(async () => {
        try {
          const result = await rejectVehicleAction(tenantId, id);
          if (result.success) {
            setVehicles(prev => prev.filter(v => v.$id !== id));
            setTotal(prev => prev - 1);
            toast.success("Vehicle rejected and removed");
          } else toast.error(result.error || "Failed to reject vehicle");
        } catch { toast.error("Failed to reject vehicle"); }
        finally { setDialog(null); }
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = {
    total,
    active:          vehicles.filter(v => v.status === "active").length,
    inactive:        vehicles.filter(v => v.status === "inactive").length,
    expiringPermits: vehicles.filter(v => isExpiringSoon(v.operatingPermitExpiry) || isExpired(v.operatingPermitExpiry)).length,
  };

  const dialogConfig = dialog ? DIALOG_CONFIG[dialog.action] : null;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your taxi fleet and vehicle compliance</p>
        </div>
        <Link href={`/tenant/${tenantId}/vehicles/new`}>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Plus className="h-3.5 w-3.5" />
            Add vehicle
          </button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total vehicles"
          value={isLoading ? null : stats.total}
          icon={<Car className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active"
          value={isLoading ? null : stats.active}
          valueClass="text-green-700 dark:text-green-400"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
        <StatCard
          label="Inactive"
          value={isLoading ? null : stats.inactive}
          valueClass="text-red-700 dark:text-red-400"
          icon={<XCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />}
        />
        <StatCard
          label="Permits expiring"
          value={isLoading ? null : stats.expiringPermits}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
      </div>

      {/* Fleet table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Vehicle fleet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all registered vehicles</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by registration, make…"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => pushParams({ status: e.target.value, page: "1" })}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending approval</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {total} vehicle{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Vehicle", "Registration", "Capacity", "Compliance", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {!searchQuery && statusFilter === "all"
                      ? "No vehicles registered yet. Add your first vehicle to get started."
                      : "No vehicles match your search."}
                  </td>
                </tr>
              ) : (
                vehicles.map(vehicle => (
                  <tr
                    key={vehicle.$id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      STATUS_STRIPE[vehicle.status] ?? "border-l-[3px] border-l-transparent"
                    )}
                  >
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                          <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{vehicle.make} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <MonoPill>{vehicle.registrationNumber}</MonoPill>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {vehicle.capacity} seats
                    </td>
                    <td className="px-4 py-3">
                      <ComplianceCell
                        permitExpiry={vehicle.operatingPermitExpiry}
                        insuranceExpiry={vehicle.insuranceExpiry}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={vehicle.status} />
                    </td>
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
                            <Link href={`/tenant/${tenantId}/vehicles/${vehicle.$id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tenant/${tenantId}/vehicles/${vehicle.$id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit vehicle
                            </Link>
                          </DropdownMenuItem>
                          {vehicle.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-green-600 dark:text-green-400"
                                onClick={() => setDialog({ id: vehicle.$id, action: "approve" })}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve vehicle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDialog({ id: vehicle.$id, action: "reject" })}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Reject vehicle
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDialog({ id: vehicle.$id, action: "delete" })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove vehicle
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => pushParams({ page: String(currentPage - 1) })}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => pushParams({ page: String(currentPage + 1) })}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared confirmation dialog */}
      <AlertDialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogConfig?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={dialogConfig?.confirmClass}
              disabled={isPending}
            >
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{dialogConfig?.pendingLabel}</>
                : dialogConfig?.confirmLabel
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}