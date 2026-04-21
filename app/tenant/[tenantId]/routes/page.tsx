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
  Search,
  Filter,
  Car,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Route as RouteIcon,
  List,
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
import { Route, RouteStatus } from "@/types";
import { getRoutesAction, deleteRouteAction } from "../actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capacityClass(current: number, max: number) {
  const pct = (current / max) * 100;
  if (pct >= 100) return "text-red-700 dark:text-red-400 font-medium";
  if (pct >= 70)  return "text-amber-700 dark:text-amber-400 font-medium";
  return "text-green-700 dark:text-green-400 font-medium";
}

// Safely get stop count (stops can be array or JSON string)
function getStopCount(route: Route): number {
  if (!route.stops) return 0;
  if (Array.isArray(route.stops)) return route.stops.length;
  if (typeof route.stops === 'string') {
    try {
      return JSON.parse(route.stops).length;
    } catch {
      return 0;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MonoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tracking-wider text-foreground">
      {children}
    </span>
  );
}

function RouteCodeCell({ code }: { code: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-xs font-semibold tracking-wide text-foreground">
      {code}
    </div>
  );
}

function StatusPill({ status }: { status: RouteStatus }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    active:   { dot: "bg-green-600", pill: "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100", label: "Active" },
    inactive: { dot: "bg-red-600",   pill: "bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",   label: "Inactive" },
  };
  const s = map[status] ?? { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

const ROUTE_STRIPE: Record<string, string> = {
  active:   "border-l-[3px] border-l-green-600",
  inactive: "border-l-[3px] border-l-red-600",
};

function StatCard({ label, value, valueClass, icon }: {
  label: string;
  value: number | string | null;
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
        ? <Skeleton className="h-7 w-12" />
        : <div className={cn("text-2xl font-semibold leading-none tabular-nums", valueClass)}>{value}</div>
      }
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-l-[3px] border-l-transparent">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-8" />
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

export default function RoutesPage() {
  const params       = useParams();
  const tenantId     = params.tenantId as string;
  const router       = useRouter();
  const searchParams = useSearchParams();

  const currentPage  = Number(searchParams.get("page") ?? "1");
  const searchQuery  = searchParams.get("q") ?? "";
  const statusFilter = (searchParams.get("status") as RouteStatus | "all") ?? "all";

  const [inputValue, setInputValue] = useState(searchQuery);
  const [routes, setRoutes]         = useState<Route[]>([]);
  const [total, setTotal]           = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId]      = useState<string | null>(null);

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
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch
  useEffect(() => {
    async function fetchRoutes() {
      setIsLoading(true);
      try {
        const status = statusFilter === "all" ? undefined : statusFilter;
        const result = await getRoutesAction(tenantId, currentPage, PAGE_SIZE, status);
        if (result.success && result.data) {
          setRoutes(result.data.documents);
          setTotal(result.data.total);
        } else {
          toast.error(result.error || "Failed to fetch routes");
        }
      } catch (error) {
        console.error("Error fetching routes:", error);
        toast.error("Failed to fetch routes");
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutes();
  }, [tenantId, currentPage, statusFilter, searchQuery]);

  // Delete
  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        const result = await deleteRouteAction(tenantId, deleteId);
        if (result.success) {
          setRoutes(prev => prev.filter(r => r.$id !== deleteId));
          setTotal(prev => prev - 1);
          toast.success("Route deleted successfully");
        } else {
          toast.error(result.error || "Failed to delete route");
        }
      } catch (error) {
        console.error("Error deleting route:", error);
        toast.error("Failed to delete route");
      } finally {
        setDeleteId(null);
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = {
    total,
    active:        routes.filter(r => r.status === "active").length,
    totalVehicles: routes.reduce((s, r) => s + (r.currentVehicleCount || 0), 0),
    avgFare:       routes.length > 0
      ? Math.round(routes.reduce((s, r) => s + r.baseFare, 0) / routes.length)
      : 0,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage taxi routes and vehicle assignments</p>
        </div>
        <Link href={`/tenant/${tenantId}/routes/new`}>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Plus className="h-3.5 w-3.5" />
            Add route
          </button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total routes"
          value={isLoading ? null : stats.total}
          icon={<RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active routes"
          value={isLoading ? null : stats.active}
          valueClass="text-green-700 dark:text-green-400"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
        <StatCard
          label="Assigned vehicles"
          value={isLoading ? null : stats.totalVehicles}
          icon={<Car className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Average fare"
          value={isLoading ? null : `R ${stats.avgFare}`}
        />
      </div>

      {/* Routes table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Route directory</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all registered taxi routes</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search routes by name, code…"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={e => pushParams({ status: e.target.value, page: "1" })}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {total} route{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Route", "Origin → destination", "Distance", "Fare", "Vehicles", "Stops", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    {!searchQuery && statusFilter === "all"
                      ? "No routes created yet. Add your first route to get started."
                      : "No routes found matching your criteria."}
                  </td>
                </tr>
              ) : (
                routes.map(route => {
                  const stopCount = getStopCount(route);
                  return (
                    <tr
                      key={route.$id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        ROUTE_STRIPE[route.status] ?? "border-l-[3px] border-l-transparent"
                      )}
                    >
                      {/* Route */}
                      <td className="px-4 py-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          <RouteCodeCell code={route.code} />
                          <div>
                            <p className="font-medium leading-tight">{route.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {route.$id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Origin → destination */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full bg-green-600 shrink-0" />
                            {route.origin}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
                            {route.destination}
                          </span>
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {route.distance} km
                      </td>

                      {/* Fare */}
                      <td className="px-4 py-3">
                        <MonoPill>R {route.baseFare}</MonoPill>
                      </td>

                      {/* Vehicles */}
                      <td className="px-4 py-3">
                        <span className={capacityClass(route.currentVehicleCount, route.maxVehicles)}>
                          {route.currentVehicleCount}/{route.maxVehicles}
                        </span>
                      </td>

                      {/* Stops */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {stopCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <List className="h-3 w-3" />
                            {stopCount} stop{stopCount !== 1 ? 's' : ''}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusPill status={route.status} />
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
                              <Link href={`/tenant/${tenantId}/routes/${route.$id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/tenant/${tenantId}/routes/${route.$id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit route
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(route.$id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete route
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this route? This action cannot be undone. All vehicle assignments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
  );
}