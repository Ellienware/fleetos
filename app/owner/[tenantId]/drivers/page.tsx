import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Users, Phone, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getOwnerDriversAction } from '../actions';

export const metadata: Metadata = { title: 'My Drivers' };
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static caching

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateString: string): number {
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000);
}

function isExpired(dateString: string)      { return daysUntil(dateString) <= 0; }
function isExpiringSoon(dateString: string) { const d = daysUntil(dateString); return d > 0 && d <= 30; }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    active:    { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Active' },
    inactive:  { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: 'Inactive' },
    suspended: { dot: 'bg-red-600',   pill: 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',   label: 'Suspended' },
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

function MonoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tracking-wider text-foreground">
      {children}
    </span>
  );
}

const STRIPE: Record<string, string> = {
  active:    'border-l-[3px] border-l-green-600',
  inactive:  'border-l-[3px] border-l-muted-foreground/40',
  suspended: 'border-l-[3px] border-l-red-600',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerDriversPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const driversResult = await getOwnerDriversAction(tenantId, 1, 100);
  const drivers = driversResult.success && driversResult.data ? driversResult.data.documents : [];

  const expiringDrivers = drivers.filter((d: any) => {
    const prdp    = daysUntil(d.prdpExpiry);
    const license = daysUntil(d.driverLicenseExpiry);
    return (prdp > 0 && prdp <= 30) || (license > 0 && license <= 30);
  });

  const stats = {
    total:    drivers.length,
    active:   drivers.filter((d: any) => d.status === 'active').length,
    inactive: drivers.filter((d: any) => d.status !== 'active').length,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My drivers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage drivers assigned to your vehicles
          </p>
        </div>
        <Link
          href={`/owner/${tenantId}/drivers/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add driver
        </Link>
      </div>

      {/* Expiring licenses banner */}
      {expiringDrivers.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {expiringDrivers.length} driver{expiringDrivers.length !== 1 ? 's' : ''} with licenses expiring soon
            </p>
            <p className="mt-0.5 text-xs text-amber-800/70 dark:text-amber-300/70">
              Ensure all driver licenses and PrDP documents are renewed on time.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total drivers</span>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
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
            <span className="text-xs text-muted-foreground">Inactive / suspended</span>
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Drivers table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">All drivers</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Drivers registered under your ownership</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No drivers registered</p>
              <p className="mt-1 text-xs text-muted-foreground">Add your first driver to get started.</p>
            </div>
            <Link
              href={`/owner/${tenantId}/drivers/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add driver
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Name', 'ID number', 'Phone', 'License code', 'PrDP expiry', 'License expiry', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.map((driver: any) => (
                <tr
                  key={driver.$id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    STRIPE[driver.status] ?? 'border-l-[3px] border-l-transparent'
                  )}
                >
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                      </div>
                      <span className="font-medium">
                        {driver.firstName} {driver.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><MonoPill>{driver.idNumber}</MonoPill></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      {driver.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3"><MonoPill>{driver.driverLicenseCode}</MonoPill></td>
                  <td className="px-4 py-3"><ExpiryCell dateString={driver.prdpExpiry} /></td>
                  <td className="px-4 py-3"><ExpiryCell dateString={driver.driverLicenseExpiry} /></td>
                  <td className="px-4 py-3"><StatusPill status={driver.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/owner/${tenantId}/drivers/${driver.$id}`}
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