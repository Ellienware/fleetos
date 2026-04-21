'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Edit, Eye, Route as RouteIcon, Trash2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getRanksByTenant } from '@/lib/appwrite/collections/ranks';
import { deleteRankAction } from '../actions';
import type { Rank } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      active
        ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
        : 'bg-muted text-muted-foreground'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', active ? 'bg-green-600' : 'bg-muted-foreground')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RankCard({ rank, onDelete }: { rank: Rank; onDelete: (id: string, name: string) => void }) {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className={cn(
      'overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/20',
      rank.isActive
        ? 'border-l-[3px] border-l-green-600'
        : 'border-l-[3px] border-l-muted-foreground/40'
    )}>
      <div className="flex items-start justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium">{rank.name}</p>
            <StatusPill active={rank.isActive} />
          </div>
        </div>
        <Link
          href={`/tenant/${tenantId}/ranks/${rank.$id}/edit`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Edit className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 divide-x border-b text-xs">
        <div className="px-4 py-2.5">
          <p className="text-muted-foreground">Auto-dispatch</p>
          <p className={cn('mt-0.5 font-medium', rank.autoDispatch ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
            {rank.autoDispatch ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-muted-foreground">Timeout</p>
          <p className="mt-0.5 font-medium tabular-nums">{rank.responseTimeoutMinutes} min</p>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-3">
        <Link
          href={`/tenant/${tenantId}/ranks/${rank.$id}/queue`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Eye className="h-3 w-3" /> Queue
        </Link>
        <Link
          href={`/tenant/${tenantId}/ranks/${rank.$id}/routes`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RouteIcon className="h-3 w-3" /> Routes
        </Link>
        <button
          onClick={() => onDelete(rank.$id, rank.name)}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          title="Delete rank"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RanksPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getRanksByTenant(tenantId)
      .then(data => {
        setRanks(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load ranks. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteRankAction(tenantId, deleteTarget.id);
      if (result.success) {
        setRanks(prev => prev.filter(r => r.$id !== deleteTarget.id));
        toast.success('Rank deleted');
      } else {
        toast.error(result.error ?? 'Failed to delete rank');
      }
      setDeleteTarget(null);
    });
  };

  const stats = {
    total: ranks.length,
    active: ranks.filter(r => r.isActive).length,
    auto: ranks.filter(r => r.autoDispatch).length,
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ranks</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage taxi ranks and queue dispatch</p>
        </div>
        <Link
          href={`/tenant/${tenantId}/ranks/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add rank
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total ranks</span>
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {stats.active}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Auto-dispatch</span>
            <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-amber-600 dark:text-amber-400">
            {stats.auto}
          </div>
        </div>
      </div>

      {ranks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No ranks created yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your first rank to start managing queues.</p>
          </div>
          <Link
            href={`/tenant/${tenantId}/ranks/new`}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add rank
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ranks.map(rank => (
            <RankCard key={rank.$id} rank={rank} onDelete={(id, name) => setDeleteTarget({ id, name })} />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated queue entries and route assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}