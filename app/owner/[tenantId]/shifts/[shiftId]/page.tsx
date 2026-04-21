import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Users, Bus, FileText, Edit } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { getShiftById } from '@/lib/appwrite/collections/shifts';
import { getDriverById } from '@/lib/appwrite/collections/drivers';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { cn } from '@/lib/utils';
import { cancelOwnerShiftAction } from '../../actions';

export const metadata: Metadata = { title: 'Shift details' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOwnerId(tenantId: string, userId: string): Promise<string | null> {
  const { databases } = createAdminClient();
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.OWNERS,
      [Query.equal('tenantId', tenantId), Query.equal('userId', userId), Query.limit(1)]
    );
    return response.documents[0]?.$id ?? null;
  } catch { return null; }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
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

const STRIPE: Record<string, string> = {
  scheduled:   'border-l-[3px] border-l-blue-500',
  in_progress: 'border-l-[3px] border-l-green-600',
  completed:   'border-l-[3px] border-l-muted-foreground/40',
  cancelled:   'border-l-[3px] border-l-red-600',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; shiftId: string }>;
}) {
  const { tenantId, shiftId } = await params;
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

  const shift = await getShiftById(shiftId);
  if (!shift || shift.ownerId !== ownerId) notFound();

  const [driver, vehicle] = await Promise.all([
    shift.driverId  ? getDriverById(shift.driverId)   : null,
    shift.vehicleId ? getVehicleById(shift.vehicleId) : null,
  ]);

  const driverInitials = driver
    ? `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toUpperCase()
    : '??';

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/owner/${tenantId}/shifts`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Shift details</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDateTime(shift.startTime)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/owner/${tenantId}/shifts/${shiftId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>
          {shift.status === 'scheduled' && (
            <form action={async () => {
              'use server';
              await cancelOwnerShiftAction(tenantId, shiftId);
              redirect(`/owner/${tenantId}/shifts`);
            }}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
              >
                Cancel shift
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          {/* Timeline */}
          <div className={cn('overflow-hidden rounded-xl border bg-card', STRIPE[shift.status] ?? 'border-l-[3px] border-l-transparent')}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <p className="text-sm font-medium">Shift timeline</p>
              <StatusPill status={shift.status} />
            </div>
            <div className="px-5 py-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Start</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{formatDateTime(shift.startTime)}</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">End</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{formatDateTime(shift.endTime)}</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Duration</p>
                  <span className="text-sm font-medium tabular-nums">
                    {formatDuration(shift.startTime, shift.endTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="overflow-hidden rounded-xl border bg-card border-l-[3px] border-l-blue-500">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-medium">Assignment</p>
            </div>
            <div className="divide-y px-5">

              {/* Driver */}
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {driverInitials}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="text-sm font-medium">
                    {driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Vehicle */}
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-mono text-sm font-medium tracking-wider">
                    {vehicle?.registrationNumber ?? 'Unknown'}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {shift.notes && (
            <div className="overflow-hidden rounded-xl border border-l-[3px] border-l-amber-500 bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Notes</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{shift.notes}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}