import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Calendar, Clock, Users, Bus, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getShiftsByOwner } from '@/lib/appwrite/collections/shifts';
import { getDriversByOwner } from '@/lib/appwrite/collections/drivers';
import { getVehiclesByOwner } from '@/lib/appwrite/collections/vehicles';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Shifts' };

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getOwnerId(tenantId: string, userId: string): Promise<string | null> {
  const { databases } = createAdminClient();
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.OWNERS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('userId', userId),
        Query.limit(1),
      ]
    );
    return response.documents.length > 0 ? response.documents[0].$id : null;
  } catch {
    return null;
  }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    scheduled:   { dot: 'bg-blue-500',  pill: 'bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100',  label: 'Scheduled' },
    in_progress: { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'In progress' },
    completed:   { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: 'Completed' },
    cancelled:   { dot: 'bg-red-600',   pill: 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',   label: 'Cancelled' },
  };
  const s = map[status] ?? { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: status };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
    </span>
  );
}

const SHIFT_STRIPE: Record<string, string> = {
  scheduled:   'border-l-[3px] border-l-blue-500',
  in_progress: 'border-l-[3px] border-l-green-600',
  completed:   'border-l-[3px] border-l-muted-foreground/40',
  cancelled:   'border-l-[3px] border-l-red-600',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerShiftsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const ownerId = await getOwnerId(tenantId, session.userId);
  if (!ownerId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Owner record not found.</p>
      </div>
    );
  }

  const [shiftsResult, driversResult, vehicles] = await Promise.all([
    getShiftsByOwner(ownerId, 1, 100).catch(() => ({ documents: [], total: 0 })),
    getDriversByOwner(ownerId, 1, 100).catch(() => ({ documents: [], total: 0 })),
    getVehiclesByOwner(ownerId).catch(() => []),
  ]);

  const shifts  = shiftsResult.documents  || [];
  const drivers = driversResult.documents || [];

  const driversMap  = new Map(drivers.map((d: any)  => [d.$id, d]));
  const vehiclesMap = new Map(vehicles.map((v: any) => [v.$id, v]));

  const stats = {
    scheduled:   shifts.filter((s: any) => s.status === 'scheduled').length,
    in_progress: shifts.filter((s: any) => s.status === 'in_progress').length,
    completed:   shifts.filter((s: any) => s.status === 'completed').length,
    cancelled:   shifts.filter((s: any) => s.status === 'cancelled').length,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Schedule and manage shifts for your drivers
          </p>
        </div>
        <Link
          href={`/owner/${tenantId}/shifts/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Schedule shift
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Scheduled</span>
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-blue-600 dark:text-blue-400">
            {stats.scheduled}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">In progress</span>
            <Clock className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {stats.in_progress}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completed</span>
            <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {stats.completed}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cancelled</span>
            <XCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-red-700 dark:text-red-400">
            {stats.cancelled}
          </div>
        </div>
      </div>

      {/* Shifts table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">All shifts</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all scheduled and past shifts</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No shifts scheduled</p>
              <p className="mt-1 text-xs text-muted-foreground">Schedule your first shift to get started.</p>
            </div>
            <Link
              href={`/owner/${tenantId}/shifts/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule shift
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Start time', 'End time', 'Driver', 'Vehicle', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shifts.map((shift: any) => {
                const driver  = driversMap.get(shift.driverId)  as any;
                const vehicle = vehiclesMap.get(shift.vehicleId) as any;

                return (
                  <tr
                    key={shift.$id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      SHIFT_STRIPE[shift.status] ?? 'border-l-[3px] border-l-transparent'
                    )}
                  >
                    {/* Start time */}
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{formatDateTime(shift.startTime)}</span>
                      </div>
                    </td>

                    {/* End time */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(shift.endTime)}
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {driver ? (
                          <>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                              {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                            </div>
                            <span className="text-sm">{driver.firstName} {driver.lastName}</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Unknown</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {vehicle?.registrationNumber
                          ? <span className="font-mono text-xs font-medium tracking-wider">{vehicle.registrationNumber}</span>
                          : <span className="text-sm text-muted-foreground">Unknown</span>
                        }
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusPill status={shift.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/owner/${tenantId}/shifts/${shift.$id}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}