'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Trash2,
  Loader2,
  DollarSign,
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
import type { Fine, FineStatus, Owner } from '@/types';
import { FINE_TYPES } from '@/types';
import {
  getFinesAction,
  getOwnersAction,
  createFineAction,
  waiveFineAction,
  markFinePaidAction,
  deleteFineAction,   // make sure this action exists (see note below)
} from '../actions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type DialogAction = 'markPaid' | 'waive' | 'delete';
interface DialogState { fineId: string; action: DialogAction }

const STATUS_STRIPE: Record<FineStatus, string> = {
  paid:     'border-l-[3px] border-l-green-600',
  pending:  'border-l-[3px] border-l-amber-500',
  waived:   'border-l-[3px] border-l-muted-foreground',
  appealed: 'border-l-[3px] border-l-purple-500',
};

const STATUS_BADGE: Record<FineStatus, { dot: string; pill: string; label: string }> = {
  paid:     { dot: 'bg-green-600', pill: 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100', label: 'Paid' },
  pending:  { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', label: 'Pending' },
  waived:   { dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: 'Waived' },
  appealed: { dot: 'bg-purple-600', pill: 'bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100', label: 'Appealed' },
};

const DIALOG_CONFIG: Record<DialogAction, {
  title: string; description: string;
  confirmLabel: string; pendingLabel: string; confirmClass: string;
}> = {
  markPaid: {
    title: 'Mark fine as paid',
    description: 'This will record the fine as paid. Confirm you have received the payment.',
    confirmLabel: 'Mark as paid',
    pendingLabel: 'Updating…',
    confirmClass: 'bg-green-600 text-white hover:bg-green-700',
  },
  waive: {
    title: 'Waive fine',
    description: 'This will waive the fine. The owner will no longer be required to pay.',
    confirmLabel: 'Waive',
    pendingLabel: 'Waiving…',
    confirmClass: '',
  },
  delete: {
    title: 'Delete fine',
    description: 'Are you sure you want to delete this fine? This action cannot be undone.',
    confirmLabel: 'Delete',
    pendingLabel: 'Deleting…',
    confirmClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: FineStatus }) {
  const s = STATUS_BADGE[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const label = FINE_TYPES.find(t => t.value === type)?.label || type;
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
      {label}
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
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue fine sheet
// ---------------------------------------------------------------------------

function IssueFineSheet({
  open, onClose, owners, tenantId, onCreated,
}: {
  open: boolean; onClose: () => void;
  owners: Owner[]; tenantId: string;
  onCreated: (f: Fine) => void;
}) {
  const [selectedOwner, setSelectedOwner] = useState('');
  const [fineType, setFineType]           = useState('');
  const [amount, setAmount]               = useState('');
  const [description, setDescription]     = useState('');
  const [isPending, start]                = useTransition();

  const handleSubmit = () => {
    if (!selectedOwner || !fineType || !amount || !description) {
      toast.error('Please fill in all fields'); return;
    }
    start(async () => {
      try {
        const result = await createFineAction(tenantId, {
          ownerId: selectedOwner,
          type: fineType as Fine['type'],
          amount: parseFloat(amount),
          description,
        });
        if (result.success && result.data) {
          onCreated(result.data);
          toast.success('Fine issued successfully');
          onClose();
          setSelectedOwner(''); setFineType(''); setAmount(''); setDescription('');
        } else {
          toast.error(result.error || 'Failed to issue fine');
        }
      } catch { toast.error('Failed to issue fine'); }
    });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l bg-background shadow-xl">
        <div className="border-b px-5 py-4">
          <p className="font-medium">Issue new fine</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Record a violation and issue a fine to an owner</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Owner</label>
            <select
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full"
            >
              <option value="">Select owner…</option>
              {owners.map(o => <option key={o.$id} value={o.$id}>{o.firstName} {o.lastName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Violation type</label>
            <select
              value={fineType}
              onChange={e => setFineType(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full"
            >
              <option value="">Select type…</option>
              {FINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Amount (ZAR)</label>
            <input
              type="number"
              placeholder="1000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the violation…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring w-full resize-none"
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
            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Issuing…</> : 'Issue fine'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinesPage() {
  const params   = useParams();
  const tenantId = params.tenantId as string;

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<FineStatus | 'all'>('all');
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [dialog, setDialog]             = useState<DialogState | null>(null);

  const [fines, setFines]     = useState<Fine[]>([]);
  const [owners, setOwners]   = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [pendingMark,   startMark]   = useTransition();
  const [pendingWaive,  startWaive]  = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const isPending =
    dialog?.action === 'markPaid' ? pendingMark  :
    dialog?.action === 'waive'   ? pendingWaive  : pendingDelete;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const status = statusFilter === 'all' ? undefined : statusFilter;
        // Convert status to the union expected by getFinesAction (only pending/paid/waived)
        // 'appealed' is not supported by the backend, so we treat it as 'pending' for filtering.
        let backendStatus: 'pending' | 'paid' | 'waived' | undefined = undefined;
        if (status && status !== 'appealed') {
          backendStatus = status as 'pending' | 'paid' | 'waived';
        } else if (status === 'appealed') {
          // If user selected 'appealed', we can't filter by status because backend doesn't have it.
          // So we fetch all and then filter client-side.
          backendStatus = undefined;
        }
        const [fr, or] = await Promise.all([
          getFinesAction(tenantId, 1, 100, backendStatus),
          getOwnersAction(tenantId, 1, 100),
        ]);
        let allFines = fr.success && fr.data ? fr.data.documents : [];
        if (status === 'appealed') {
          allFines = allFines.filter(f => f.status === 'appealed');
        }
        setFines(allFines);
        if (or.success && or.data) setOwners(or.data.documents);
      } catch { toast.error('Failed to load fines'); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [tenantId, statusFilter]);

  const getOwnerName = (id: string) => {
    const o = owners.find(o => o.$id === id);
    return o ? `${o.firstName} ${o.lastName}` : 'Unknown';
  };

  const filteredFines = fines.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getOwnerName(f.ownerId).toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q)
    );
  });

  const handleConfirm = () => {
    if (!dialog) return;
    const { fineId, action } = dialog;

    if (action === 'markPaid') {
      startMark(async () => {
        try {
          const result = await markFinePaidAction(tenantId, fineId, `manual-${Date.now()}`);
          if (result.success && result.data) {
            setFines(prev => prev.map(f => f.$id === fineId ? result.data! : f));
            toast.success('Fine marked as paid');
          } else toast.error(result.error || 'Failed to update fine');
        } catch { toast.error('Failed to update fine'); }
        finally { setDialog(null); }
      });
    } else if (action === 'waive') {
      startWaive(async () => {
        try {
          const result = await waiveFineAction(tenantId, fineId);
          if (result.success && result.data) {
            setFines(prev => prev.map(f => f.$id === fineId ? result.data! : f));
            toast.success('Fine waived');
          } else toast.error(result.error || 'Failed to waive fine');
        } catch { toast.error('Failed to waive fine'); }
        finally { setDialog(null); }
      });
    } else {
      startDelete(async () => {
        try {
          const result = await deleteFineAction(tenantId, fineId);
          if (result.success) {
            setFines(prev => prev.filter(f => f.$id !== fineId));
            toast.success('Fine deleted');
          } else toast.error(result.error || 'Failed to delete fine');
        } catch { toast.error('Failed to delete fine'); }
        finally { setDialog(null); }
      });
    }
  };

  const stats = {
    totalPending:   fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0),
    totalCollected: fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    pendingCount:   fines.filter(f => f.status === 'pending').length,
    waivedCount:    fines.filter(f => f.status === 'waived').length,
  };

  const dialogConfig = dialog ? DIALOG_CONFIG[dialog.action] : null;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fines & violations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage disciplinary fines and track payments</p>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Issue fine
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending amount"
          value={isLoading ? null : `R ${stats.totalPending.toLocaleString()}`}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
        <StatCard
          label="Total collected"
          value={isLoading ? null : `R ${stats.totalCollected.toLocaleString()}`}
          valueClass="text-green-700 dark:text-green-400"
          icon={<DollarSign className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
        <StatCard
          label="Outstanding fines"
          value={isLoading ? null : stats.pendingCount}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
        <StatCard
          label="Waived"
          value={isLoading ? null : stats.waivedCount}
          icon={<XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
        />
      </div>

      {/* Fines table card */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Fine records</p>
            <p className="mt-0.5 text-xs text-muted-foreground">View and manage all issued fines</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by owner, type…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as FineStatus | 'all')}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
            <option value="appealed">Appealed</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filteredFines.length} fine{filteredFines.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Owner', 'Type', 'Description', 'Amount', 'Status', 'Issued', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {fines.length === 0 ? 'No fines issued yet.' : 'No fines match your search.'}
                  </td>
                </tr>
              ) : (
                filteredFines.map(fine => (
                  <tr
                    key={fine.$id}
                    className={cn(
                      'transition-colors hover:bg-muted/30',
                      STATUS_STRIPE[fine.status] ?? 'border-l-[3px] border-l-transparent'
                    )}
                  >
                    <td className="px-4 py-3 pl-5 font-medium">{getOwnerName(fine.ownerId)}</td>
                    <td className="px-4 py-3"><TypePill type={fine.type} /></td>
                    <td className="max-w-[180px] px-4 py-3 truncate text-sm text-muted-foreground">{fine.description}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">R {fine.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusPill status={fine.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(fine.issuedAt).toLocaleDateString('en-ZA')}
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
                          {fine.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                className="text-green-600 dark:text-green-400"
                                onClick={() => setDialog({ fineId: fine.$id, action: 'markPaid' })}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as paid
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDialog({ fineId: fine.$id, action: 'waive' })}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Waive fine
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDialog({ fineId: fine.$id, action: 'delete' })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete fine
                          </DropdownMenuItem>
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

      {/* Issue fine sheet */}
      <IssueFineSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        owners={owners}
        tenantId={tenantId}
        onCreated={f => setFines(prev => [f, ...prev])}
      />
    </div>
  );
}