import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getFinesByOwner } from '@/lib/appwrite/collections/fines';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'My Fines' };

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

function formatFineType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FinePill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    pending:  { dot: 'bg-red-600',            pill: 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',   label: 'Pending' },
    paid:     { dot: 'bg-green-600',           pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Paid' },
    waived:   { dot: 'bg-muted-foreground',    pill: 'bg-muted    text-muted-foreground',                                label: 'Waived' },
    appealed: { dot: 'bg-blue-500',            pill: 'bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100',  label: 'Appealed' },
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

const FINE_STRIPE: Record<string, string> = {
  pending:  'border-l-[3px] border-l-red-600',
  paid:     'border-l-[3px] border-l-green-600',
  waived:   'border-l-[3px] border-l-muted-foreground/40',
  appealed: 'border-l-[3px] border-l-blue-500',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerFinesPage({
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

  const fines = await getFinesByOwner(ownerId).catch(() => []);

  const pendingFines = fines.filter((f: any) => f.status === 'pending');
  const paidFines    = fines.filter((f: any) => f.status === 'paid');
  const waivedFines  = fines.filter((f: any) => f.status === 'waived');

  const pendingAmount = pendingFines.reduce((s: number, f: any) => s + f.amount, 0);
  const paidAmount    = paidFines.reduce((s: number, f: any) => s + f.amount, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My fines</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">View and pay outstanding fines</p>
        </div>
        {pendingFines.length > 0 && (
          <Link
            href={`/owner/${tenantId}/payments?type=fine`}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pay fines
          </Link>
        )}
      </div>

      {/* Outstanding balance banner */}
      {pendingAmount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 dark:border-red-800 dark:bg-red-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Outstanding balance: R {pendingAmount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-red-800/70 dark:text-red-300/70">
              You have {pendingFines.length} unpaid fine{pendingFines.length !== 1 ? 's' : ''}. Pay promptly to avoid further penalties.
            </p>
          </div>
          <Link
            href={`/owner/${tenantId}/payments?type=fine`}
            className="shrink-0 inline-flex items-center rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 dark:border-red-700 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
          >
            Pay now
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total fines</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">{fines.length}</div>
        </div>

        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pending</span>
            <Clock className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-red-700 dark:text-red-400">
            {pendingFines.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">R {pendingAmount.toLocaleString()}</p>
        </div>

        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Paid</span>
            <CheckCircle className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {paidFines.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">R {paidAmount.toLocaleString()}</p>
        </div>

        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Waived</span>
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {waivedFines.length}
          </div>
        </div>
      </div>

      {/* Fines table */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">All fines</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your fine history and payment status</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {fines.length} fine{fines.length !== 1 ? 's' : ''}
          </span>
        </div>

        {fines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">No fines on record</p>
              <p className="mt-1 text-xs text-muted-foreground">Keep up the good work!</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Date issued', 'Type', 'Description', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {fines.map((fine: any) => (
                <tr
                  key={fine.$id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    FINE_STRIPE[fine.status] ?? 'border-l-[3px] border-l-transparent'
                  )}
                >
                  {/* Date */}
                  <td className="px-4 py-3 pl-5 text-sm text-muted-foreground">
                    {new Date(fine.issuedAt).toLocaleDateString('en-ZA')}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {formatFineType(fine.type)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="truncate text-sm text-muted-foreground" title={fine.description}>
                      {fine.description}
                    </p>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3">
                    <MonoPill>R {fine.amount.toLocaleString()}</MonoPill>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <FinePill status={fine.status} />
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    {fine.status === 'pending' && (
                      <Link
                        href={`/owner/${tenantId}/payments?fineId=${fine.$id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <CreditCard className="h-3 w-3" />
                        Pay
                      </Link>
                    )}
                    {fine.status === 'paid' && fine.paidAt && (
                      <span className="text-xs text-muted-foreground">
                        Paid {new Date(fine.paidAt).toLocaleDateString('en-ZA')}
                      </span>
                    )}
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