'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, Plus, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getRankRoutesAction, assignRouteToRankAction, removeRouteFromRankAction } from '../../../actions';
import type { Route } from '@/types';

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RankRoutesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const rankId = params.rankId as string;

  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getRankRoutesAction(tenantId, rankId);
      if (res.success && res.data) {
        setAllRoutes(res.data.allRoutes as Route[]);
        setAssignedIds(new Set(res.data.assignedRouteIds));
        setError(null);
      } else {
        setError(res.error ?? 'Failed to load routes');
        toast.error('Failed to load routes');
      }
      setLoading(false);
    }
    load();
  }, [tenantId, rankId]);

  const toggle = (routeId: string, currentlyAssigned: boolean) => {
    setPendingId(routeId);
    startTransition(async () => {
      if (currentlyAssigned) {
        const res = await removeRouteFromRankAction(tenantId, rankId, routeId);
        if (res.success) {
          setAssignedIds(prev => { const s = new Set(prev); s.delete(routeId); return s; });
          toast.success('Route removed from rank');
        } else {
          toast.error(res.error ?? 'Failed to remove route');
        }
      } else {
        const res = await assignRouteToRankAction(tenantId, rankId, routeId);
        if (res.success) {
          setAssignedIds(prev => new Set(prev).add(routeId));
          toast.success('Route assigned to rank');
        } else {
          toast.error(res.error ?? 'Failed to assign route');
        }
      }
      setPendingId(null);
    });
  };

  const assignedRoutes = allRoutes.filter(r => assignedIds.has(r.$id));
  const unassignedRoutes = allRoutes.filter(r => !assignedIds.has(r.$id));

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/ranks`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rank routes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Select routes served by this rank</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Assigned routes</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {assignedIds.size}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Available routes</span>
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {unassignedRoutes.length}
          </div>
        </div>
      </div>

      {/* Assigned routes */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Assigned routes</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Routes currently served by this rank</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {assignedRoutes.length} route{assignedRoutes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {assignedRoutes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No routes assigned yet. Add routes from the list below.
          </div>
        ) : (
          <div className="divide-y">
            {assignedRoutes.map(route => (
              <div
                key={route.$id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-xs font-semibold tracking-wide">
                    {route.code}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{route.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{route.origin}</span>
                      <span>→</span>
                      <span>{route.destination}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MonoPill>R {route.baseFare}</MonoPill>
                  <button
                    onClick={() => toggle(route.$id, true)}
                    disabled={isPending && pendingId === route.$id}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
                    title="Remove from rank"
                  >
                    {isPending && pendingId === route.$id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available routes */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Available routes</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active routes that can be assigned to this rank</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {unassignedRoutes.length} route{unassignedRoutes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {unassignedRoutes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            All available routes are already assigned.
          </div>
        ) : (
          <div className="divide-y">
            {unassignedRoutes.map(route => (
              <div
                key={route.$id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-xs font-semibold tracking-wide text-muted-foreground">
                    {route.code}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{route.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{route.origin}</span>
                      <span>→</span>
                      <span>{route.destination}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MonoPill>R {route.baseFare}</MonoPill>
                  <button
                    onClick={() => toggle(route.$id, false)}
                    disabled={isPending && pendingId === route.$id}
                    className="flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    title="Assign to rank"
                  >
                    {isPending && pendingId === route.$id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Plus className="h-3 w-3" />
                    }
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}