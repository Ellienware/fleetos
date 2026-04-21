'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getQueueForRank } from '@/lib/appwrite/collections/rank-queues';
import type { RankQueueEntry } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface QueueState {
  waiting: RankQueueEntry[];
  called: RankQueueEntry[];
  loading: RankQueueEntry[];
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function waitingMins(dateString: string): string {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

function deadlineCountdown(deadlineString: string | undefined): { label: string; urgent: boolean } {
  if (!deadlineString) return { label: '—', urgent: false };
  const secs = Math.floor((new Date(deadlineString).getTime() - Date.now()) / 1000);
  if (secs <= 0) return { label: 'Expired', urgent: true };
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return {
    label: m > 0 ? `${m}m ${s}s` : `${s}s`,
    urgent: secs < 30,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    waiting: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100', label: 'Waiting' },
    called: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', label: 'Called' },
    loading: { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Loading' },
  };
  const s = map[status] ?? { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: status };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
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

function QueueTable({
  title,
  entries,
  showDeadline,
}: {
  title: string;
  entries: RankQueueEntry[];
  showDeadline?: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entries.length} vehicle{entries.length !== 1 ? 's' : ''}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">Pos</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Registration</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Entered</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Waiting</th>
            {showDeadline && (
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deadline</th>
            )}
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry, idx) => {
            const countdown = showDeadline ? deadlineCountdown(entry.loadingDeadline) : null;
            return (
              <tr key={entry.$id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 pl-5 tabular-nums text-sm text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-3">
                  <MonoPill>{entry.registrationNumber}</MonoPill>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                  {formatTime(entry.enteredAt)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                  {waitingMins(entry.enteredAt)}
                </td>
                {showDeadline && countdown && (
                  <td className={cn('px-4 py-3 text-sm font-medium tabular-nums', countdown.urgent ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                    {countdown.label}
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusPill status={entry.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (with race condition fix)
// ---------------------------------------------------------------------------

export default function QueueMonitorPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const rankId = params.rankId as string;

  const [queue, setQueue] = useState<QueueState>({ waiting: [], called: [], loading: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prevent overlapping requests
  const activeRequestRef = useRef<Promise<void> | null>(null);

  const loadQueue = useCallback(async () => {
    // If a request is already in flight, skip this one
    if (activeRequestRef.current) return;

    const request = (async () => {
      try {
        const [waiting, called, loading] = await Promise.all([
          getQueueForRank(rankId, 'waiting'),
          getQueueForRank(rankId, 'called'),
          getQueueForRank(rankId, 'loading'),
        ]);
        setQueue({ waiting, called, loading });
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load queue data');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
        activeRequestRef.current = null;
      }
    })();

    activeRequestRef.current = request;
    await request;
  }, [rankId]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleManualRefresh = () => {
    if (!activeRequestRef.current) {
      setRefreshing(true);
      loadQueue();
    }
  };

  const total = queue.waiting.length + queue.called.length + queue.loading.length;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenant/${tenantId}/ranks`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Queue monitor</h1>
            {lastUpdated && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last updated {formatTime(lastUpdated.toISOString())} · auto-refreshes every 5s
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing || !!activeRequestRef.current}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Waiting</span>
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-blue-600 dark:text-blue-400">
            {queue.waiting.length}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Called</span>
            <span className="h-3.5 w-3.5 rounded-full bg-amber-500 opacity-80" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-amber-600 dark:text-amber-400">
            {queue.called.length}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Loading</span>
            <span className="h-3.5 w-3.5 rounded-full bg-green-600 opacity-80" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {queue.loading.length}
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Queue is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">No vehicles are currently in the queue.</p>
          </div>
        </div>
      )}

      <QueueTable title="Waiting queue" entries={queue.waiting} />
      <QueueTable title="Called vehicles" entries={queue.called} showDeadline />
      <QueueTable title="Loading vehicles" entries={queue.loading} />
    </div>
  );
}