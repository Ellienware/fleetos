'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Receipt,
  Mail,
  Loader2,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MembershipPayment, Owner, PaymentStatus } from '@/types';
import {
  getPaymentsAction,
  getOwnersAction,
  createPaymentAction,
  sendPaymentReminderAction,
  markPaymentAsPaidAction,
} from '../actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisplayPayment extends MembershipPayment {
  description: string;
  transactionReference: string;
}

type DialogAction = 'markPaid' | 'remind';
interface DialogState { payment: DisplayPayment; action: DialogAction }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STRIPE: Record<PaymentStatus, string> = {
  completed: 'border-l-[3px] border-l-green-600',
  pending:   'border-l-[3px] border-l-amber-500',
  failed:    'border-l-[3px] border-l-red-600',
  refunded:  'border-l-[3px] border-l-gray-500',
};

const STATUS_BADGE: Record<PaymentStatus, { dot: string; pill: string; label: string }> = {
  completed: { dot: 'bg-green-600', pill: 'bg-green-50  text-green-900  dark:bg-green-950 dark:text-green-100',  label: 'Completed' },
  pending:   { dot: 'bg-amber-500', pill: 'bg-amber-50  text-amber-900  dark:bg-amber-950 dark:text-amber-100',  label: 'Pending'   },
  failed:    { dot: 'bg-red-600',   pill: 'bg-red-50    text-red-900    dark:bg-red-950   dark:text-red-100',    label: 'Failed'    },
  refunded:  { dot: 'bg-gray-500',  pill: 'bg-gray-100  text-gray-800   dark:bg-gray-800  dark:text-gray-200',   label: 'Refunded'  },
};

const DIALOG_CONFIG: Record<DialogAction, {
  title: string; description: string;
  confirmLabel: string; pendingLabel: string; confirmClass: string;
}> = {
  markPaid: {
    title: 'Mark as paid',
    description: 'This will mark the payment as completed. Make sure you have received the funds.',
    confirmLabel: 'Mark as paid',
    pendingLabel: 'Updating…',
    confirmClass: 'bg-green-600 text-white hover:bg-green-700',
  },
  remind: {
    title: 'Send reminder',
    description: 'A payment reminder will be sent to the owner via email.',
    confirmLabel: 'Send reminder',
    pendingLabel: 'Sending…',
    confirmClass: '',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: PaymentStatus }) {
  const s = STATUS_BADGE[status];
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

function StatCard({ label, value, valueClass, icon }: {
  label: string; value: string | number | null; valueClass?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {value === null
        ? <Skeleton className="h-7 w-20" />
        : <div className={cn('text-2xl font-semibold leading-none tabular-nums', valueClass)}>{value}</div>
      }
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-l-[3px] border-l-transparent">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record payment modal — inline, no shadcn Dialog
// ---------------------------------------------------------------------------

function RecordPaymentSheet({
  open, onClose, owners, tenantId, onCreated,
}: {
  open: boolean; onClose: () => void;
  owners: Owner[]; tenantId: string;
  onCreated: (p: DisplayPayment) => void;
}) {
  const [selectedOwner, setSelectedOwner] = useState('');
  const [amount, setAmount]               = useState('500');
  const [period, setPeriod]               = useState(new Date().toISOString().slice(0, 7));
  const [isPending, start]                = useTransition();

  const handleSubmit = () => {
    if (!selectedOwner || !amount || !period) { toast.error('Please fill in all fields'); return; }
    start(async () => {
      try {
        const result = await createPaymentAction(tenantId, {
          ownerId: selectedOwner,
          amount: parseFloat(amount),
          period,
        });
        if (result.success && result.data) {
          onCreated(result.data as unknown as DisplayPayment);
          toast.success('Payment recorded successfully');
          onClose();
          setSelectedOwner(''); setAmount('500');
        } else {
          toast.error(result.error || 'Failed to record payment');
        }
      } catch { toast.error('Failed to record payment'); }
    });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l bg-background shadow-xl">
        <div className="border-b px-5 py-4">
          <p className="font-medium">Record manual payment</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Record a cash or manual payment for an owner's membership</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Owner</label>
            <select
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select owner…</option>
              {owners.map(o => (
                <option key={o.$id} value={o.$id}>{o.firstName} {o.lastName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Amount (ZAR)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Period</label>
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Recording…</> : 'Record payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MembershipPage() {
  const params   = useParams();
  const tenantId = params.tenantId as string;

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [dialog, setDialog]             = useState<DialogState | null>(null);

  const [payments, setPayments] = useState<DisplayPayment[]>([]);
  const [owners, setOwners]     = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [pendingMark,   startMark]   = useTransition();
  const [pendingRemind, startRemind] = useTransition();

  const isPending = dialog?.action === 'markPaid' ? pendingMark : pendingRemind;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [pr, or] = await Promise.all([
          getPaymentsAction(tenantId, 1, 100),
          getOwnersAction(tenantId, 1, 100),
        ]);
        if (pr.success && pr.data) setPayments(pr.data.documents as unknown as DisplayPayment[]);
        if (or.success && or.data) setOwners(or.data.documents);
      } catch { toast.error('Failed to load payments'); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [tenantId]);

  const getOwnerName = (id: string) => {
    const o = owners.find(o => o.$id === id);
    return o ? `${o.firstName} ${o.lastName}` : 'Unknown';
  };

  const filteredPayments = payments.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    if (!searchQuery) return matchesStatus;
    const q = searchQuery.toLowerCase();
    return matchesStatus && (
      getOwnerName(p.ownerId).toLowerCase().includes(q) ||
      p.transactionReference?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  const handleConfirm = () => {
    if (!dialog) return;
    const { payment, action } = dialog;

    if (action === 'markPaid') {
      startMark(async () => {
        try {
          const result = await markPaymentAsPaidAction(tenantId, payment.$id);
          if (result.success && result.data) {
            const updated = result.data as unknown as DisplayPayment;
            setPayments(prev => prev.map(p => p.$id === payment.$id ? updated : p));
            toast.success('Payment marked as completed');
          } else toast.error(result.error || 'Failed to update payment');
        } catch { toast.error('Failed to update payment'); }
        finally { setDialog(null); }
      });
    } else {
      startRemind(async () => {
        try {
          const result = await sendPaymentReminderAction(tenantId, payment.$id, payment.ownerId);
          if (result.success) toast.success('Reminder sent successfully');
          else toast.error(result.error || 'Failed to send reminder');
        } catch { toast.error('Failed to send reminder'); }
        finally { setDialog(null); }
      });
    }
  };

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const stats = {
    totalCollected: payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    pendingAmount:  payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
    failedCount:    payments.filter(p => p.status === 'failed').length,
    paidOwners:     new Set(payments.filter(p => p.status === 'completed' && p.period === currentPeriod).map(p => p.ownerId)).size,
  };

  const dialogConfig = dialog ? DIALOG_CONFIG[dialog.action] : null;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membership payments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage and track owner membership fee payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Record payment
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total collected"
          value={isLoading ? null : `R ${stats.totalCollected.toLocaleString()}`}
          icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Pending"
          value={isLoading ? null : `R ${stats.pendingAmount.toLocaleString()}`}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
        <StatCard
          label="Failed payments"
          value={isLoading ? null : stats.failedCount}
          valueClass="text-red-700 dark:text-red-400"
          icon={<XCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />}
        />
        <StatCard
          label="Paid this period"
          value={isLoading ? null : `${stats.paidOwners} / ${owners.length}`}
          valueClass="text-green-700 dark:text-green-400"
          icon={<Users className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
      </div>

      {/* Payment table card */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Payment history</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all membership payments</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by owner, reference…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Owner', 'Description', 'Amount', 'Reference', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {payments.length === 0 ? 'No payments recorded yet.' : 'No payments match your search.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr
                    key={payment.$id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      STATUS_STRIPE[payment.status] ?? 'border-l-[3px] border-l-transparent'
                    )}
                  >
                    <td className="px-4 py-3 pl-5 font-medium">{getOwnerName(payment.ownerId)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{payment.description}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">R {payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <MonoPill>{payment.transactionReference}</MonoPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-ZA')}
                    </td>
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
                          <DropdownMenuItem onClick={() => toast.info(`Receipt: ${payment.transactionReference}`)}>
                            <Receipt className="mr-2 h-4 w-4" /> View receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ payment, action: 'remind' })}>
                            <Mail className="mr-2 h-4 w-4" /> Send reminder
                          </DropdownMenuItem>
                          {payment.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-green-600 dark:text-green-400"
                                onClick={() => setDialog({ payment, action: 'markPaid' })}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as paid
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogConfig?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogConfig?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={dialogConfig?.confirmClass}
              disabled={isPending}
            >
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{dialogConfig?.pendingLabel}</>
                : dialogConfig?.confirmLabel
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record payment sheet */}
      <RecordPaymentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        owners={owners}
        tenantId={tenantId}
        onCreated={p => setPayments(prev => [p, ...prev])}
      />
    </div>
  );
}