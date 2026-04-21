import type { Metadata } from 'next';
import { CreditCard, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getPaymentsByOwner } from '@/lib/appwrite/collections/payments';
import { getFinesByOwner } from '@/lib/appwrite/collections/fines';
import { getOwnerById } from '@/lib/appwrite/collections/owners';
import { getTenantById } from '@/lib/appwrite/collections/tenants';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { PaymentButton } from '@/components/owner/payment-button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Payments' };

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

function formatPaymentType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    completed: { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Completed' },
    pending:   { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', label: 'Pending' },
    failed:    { dot: 'bg-red-600',   pill: 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',   label: 'Failed' },
    refunded:  { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: 'Refunded' },
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

const PAYMENT_STRIPE: Record<string, string> = {
  completed: 'border-l-[3px] border-l-green-600',
  pending:   'border-l-[3px] border-l-amber-500',
  failed:    'border-l-[3px] border-l-red-600',
  refunded:  'border-l-[3px] border-l-muted-foreground/40',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerPaymentsPage({
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

  const [payments, fines, owner, tenant] = await Promise.all([
    getPaymentsByOwner(ownerId).catch(() => []),
    getFinesByOwner(ownerId).catch(() => []),
    getOwnerById(ownerId).catch(() => null),
    getTenantById(tenantId).catch(() => null),
  ]);

  const completedPayments  = payments.filter((p: any) => p.status === 'completed');
  const pendingPayments    = payments.filter((p: any) => p.status === 'pending');
  const pendingFines       = fines.filter((f: any) => f.status === 'pending');

  const totalPaid          = completedPayments.reduce((s: number, p: any) => s + p.amount, 0);
  const pendingFinesAmount = pendingFines.reduce((s: number, f: any) => s + f.amount, 0);
  const membershipFee      = (tenant as any)?.settings?.membershipFee ?? 0;

  const membershipActive = owner?.membershipStatus === 'active';

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your membership fees and fine payments
        </p>
      </div>

      {/* Action cards */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Membership fee */}
        <div className="overflow-hidden rounded-xl border border-l-[3px] border-l-blue-500 bg-card">
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Membership fee</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monthly fee for {(tenant as any)?.name ?? 'Association'}
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums">R {membershipFee.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            <div className="mb-4">
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                membershipActive
                  ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
                  : 'bg-muted text-muted-foreground'
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', membershipActive ? 'bg-green-600' : 'bg-muted-foreground')} />
                {owner?.membershipStatus ?? 'Unknown'}
              </span>
            </div>
            <PaymentButton
              ownerId={ownerId}
              tenantId={tenantId}
              amount={membershipFee}
              type="membership"
              label="Pay membership"
              ownerEmail={owner?.email ?? session.email}
            />
          </div>
        </div>

        {/* Outstanding fines */}
        <div className={cn(
          'overflow-hidden rounded-xl border border-l-[3px] bg-card',
          pendingFinesAmount > 0 ? 'border-l-red-600' : 'border-l-green-600'
        )}>
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className={cn('h-4 w-4', pendingFinesAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')} />
              <p className="text-sm font-medium">Outstanding fines</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Total unpaid fines on your account</p>
          </div>
          <div className="px-5 py-4">
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className={cn(
                'text-3xl font-semibold tabular-nums',
                pendingFinesAmount > 0 ? 'text-red-700 dark:text-red-400' : ''
              )}>
                R {pendingFinesAmount.toLocaleString()}
              </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {pendingFines.length} unpaid fine{pendingFines.length !== 1 ? 's' : ''}
            </p>
            {pendingFinesAmount > 0 ? (
              <PaymentButton
                ownerId={ownerId}
                tenantId={tenantId}
                amount={pendingFinesAmount}
                type="fine"
                label="Pay all fines"
                ownerEmail={owner?.email ?? session.email}
                variant="destructive"
              />
            ) : (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">No outstanding fines</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total paid</span>
            <CheckCircle className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            R {totalPaid.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pending transactions</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {pendingPayments.length}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total transactions</span>
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {payments.length}
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Payment history</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your payment transactions</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No payment history</p>
              <p className="mt-1 text-xs text-muted-foreground">Your payment transactions will appear here.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Date', 'Type', 'Reference', 'Amount', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment: any) => (
                <tr
                  key={payment.$id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    PAYMENT_STRIPE[payment.status] ?? 'border-l-[3px] border-l-transparent'
                  )}
                >
                  <td className="px-4 py-3 pl-5 text-sm text-muted-foreground">
                    {new Date(payment.paidAt || payment.$createdAt).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {formatPaymentType(payment.paymentType)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {payment.paystackReference
                      ? <MonoPill>{payment.paystackReference}</MonoPill>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <MonoPill>R {payment.amount.toLocaleString()}</MonoPill>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={payment.status} />
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