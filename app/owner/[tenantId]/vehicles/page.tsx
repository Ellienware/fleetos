import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Bus, Shield, Car, CheckCircle2, Clock, Wrench, AlertTriangle, ChevronRight } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getVehiclesByOwner } from '@/lib/appwrite/collections/vehicles';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'My Vehicles' };

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
    return response.documents[0]?.$id ?? null;
  } catch {
    return null;
  }
}

function daysUntil(dateString: string): number {
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000);
}

function isExpired(dateString: string)     { return daysUntil(dateString) <= 0; }
function isExpiringSoon(dateString: string) { const d = daysUntil(dateString); return d > 0 && d <= 30; }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    active:      { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Active' },
    pending:     { dot: 'bg-blue-500',  pill: 'bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100',  label: 'Pending' },
    maintenance: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', label: 'Maintenance' },
    inactive:    { dot: 'bg-red-600',   pill: 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',   label: 'Inactive' },
  };
  const s = map[status] ?? { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: status };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
    </span>
  );
}

function ExpiryCell({ dateString }: { dateString: string }) {
  const expired = isExpired(dateString);
  const soon    = isExpiringSoon(dateString);
  const days    = daysUntil(dateString);

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'text-sm',
        expired ? 'text-red-700 dark:text-red-400' :
        soon    ? 'text-amber-700 dark:text-amber-400' :
                  'text-muted-foreground'
      )}>
        {new Date(dateString).toLocaleDateString('en-ZA')}
      </span>
      {expired && (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
          Expired
        </span>
      )}
      {soon && (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {days}d left
        </span>
      )}
    </div>
  );
}

const STRIPE: Record<string, string> = {
  active:      'border-l-[3px] border-l-green-600',
  pending:     'border-l-[3px] border-l-blue-500',
  maintenance: 'border-l-[3px] border-l-amber-500',
  inactive:    'border-l-[3px] border-l-red-600',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerVehiclesPage({
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

  const vehicles = await getVehiclesByOwner(ownerId).catch(() => []);

  const expiringVehicles = vehicles.filter((v: any) => isExpiringSoon(v.operatingPermitExpiry));

  const stats = {
    total:       vehicles.length,
    active:      vehicles.filter((v: any) => v.status === 'active').length,
    pending:     vehicles.filter((v: any) => v.status === 'pending').length,
    maintenance: vehicles.filter((v: any) => v.status === 'maintenance').length,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My vehicles</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your registered vehicles and documentation
          </p>
        </div>
        <Link
          href={`/owner/${tenantId}/vehicles/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add vehicle
        </Link>
      </div>

      {/* Expiring permits banner */}
      {expiringVehicles.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {expiringVehicles.length} vehicle{expiringVehicles.length !== 1 ? 's' : ''} with permits expiring soon
            </p>
            <p className="mt-0.5 text-xs text-amber-800/70 dark:text-amber-300/70">
              Renew operating permits before they expire to avoid fines.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total vehicles</span>
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
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
            <span className="text-xs text-muted-foreground">Pending approval</span>
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-blue-600 dark:text-blue-400">
            {stats.pending}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Maintenance</span>
            <Wrench className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-amber-700 dark:text-amber-400">
            {stats.maintenance}
          </div>
        </div>
      </div>

      {/* Vehicles table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">All vehicles</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your registered vehicles and their status</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No vehicles registered</p>
              <p className="mt-1 text-xs text-muted-foreground">Add your first vehicle to get started.</p>
            </div>
            <Link
              href={`/owner/${tenantId}/vehicles/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add vehicle
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Registration', 'Vehicle', 'Capacity', 'Permit expiry', 'Insurance expiry', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.map((vehicle: any) => (
                <tr
                  key={vehicle.$id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    STRIPE[vehicle.status] ?? 'border-l-[3px] border-l-transparent'
                  )}
                >
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                        <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-mono text-xs font-medium tracking-wider">
                        {vehicle.registrationNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {vehicle.make} {vehicle.model}
                    <span className="ml-1 text-muted-foreground">({vehicle.year})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {vehicle.capacity} seats
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell dateString={vehicle.operatingPermitExpiry} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell dateString={vehicle.insuranceExpiry} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={vehicle.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/owner/${tenantId}/vehicles/${vehicle.$id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      View
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}