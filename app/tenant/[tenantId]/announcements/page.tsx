'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
  Bell,
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Notification, NotificationPriority } from '@/types';
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
} from '../actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementType = 'announcement' | 'compliance' | 'system' | 'payment';

interface AnnouncementWithStats extends Notification {
  sentTo: number;
  readBy: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRate(a: AnnouncementWithStats): number {
  return a.sentTo > 0 ? Math.round((a.readBy / a.sentTo) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: AnnouncementType }) {
  const styles: Record<AnnouncementType, string> = {
    announcement:
      'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    compliance:
      'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    payment:
      'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
    system: 'bg-muted text-muted-foreground',
  };
  const labels: Record<AnnouncementType, string> = {
    announcement: 'Announcement',
    compliance: 'Compliance',
    payment: 'Payment',
    system: 'System',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[type] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {labels[type] ?? type}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const styles: Record<string, string> = {
    high: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    medium: 'bg-muted text-muted-foreground',
    low: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    high: 'High priority',
    medium: 'Medium',
    low: 'Low',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[priority] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {labels[priority] ?? priority}
    </span>
  );
}

function ReadBar({ rate }: { rate: number }) {
  return (
    <div className="h-1 w-14 overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full bg-green-500"
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnnouncementsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('medium');
  const [notificationType, setNotificationType] =
    useState<AnnouncementType>('announcement');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);

  const [announcements, setAnnouncements] = useState<AnnouncementWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchAnnouncements() {
      setIsLoading(true);
      try {
        const result = await getAnnouncementsAction(tenantId);
        if (result.success && result.data) {
          setAnnouncements(result.data.documents);
        }
      } catch {
        toast.error('Failed to load announcements');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnnouncements();
  }, [tenantId]);

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: announcements.length,
    highPriority: announcements.filter((a) => a.priority === 'high').length,
    avgReadRate:
      announcements.length > 0
        ? Math.round(
            announcements.reduce((sum, a) => sum + readRate(a), 0) /
              announcements.length
          )
        : 0,
  };

  const handleCreate = () => {
    if (!title || !message) {
      toast.error('Please fill in all required fields');
      return;
    }
    startTransition(async () => {
      try {
        const result = await createAnnouncementAction(tenantId, {
          title,
          message,
          type: notificationType,
          priority,
        });
        if (result.success) {
          const refresh = await getAnnouncementsAction(tenantId);
          if (refresh.success && refresh.data)
            setAnnouncements(refresh.data.documents);
          toast.success('Announcement sent successfully');
          setIsCreateOpen(false);
          setTitle('');
          setMessage('');
          setPriority('medium');
          setNotificationType('announcement');
        } else {
          toast.error(result.error || 'Failed to send announcement');
        }
      } catch {
        toast.error('Failed to send announcement');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const result = await deleteAnnouncementAction(tenantId, id);
        if (result.success) {
          setAnnouncements((prev) => prev.filter((a) => a.$id !== id));
          toast.success('Announcement deleted');
        } else {
          toast.error(result.error || 'Failed to delete announcement');
        }
      } catch {
        toast.error('Failed to delete announcement');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast messages and notifications to owners
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New announcement
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total sent"
          value={isLoading ? null : stats.total}
          sub="all time"
          icon={<Bell className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="High priority"
          value={isLoading ? null : stats.highPriority}
          sub="active alerts"
          valueClass="text-red-600 dark:text-red-400"
          icon={
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          }
        />
        <StatCard
          label="Avg. read rate"
          value={isLoading ? null : stats.avgReadRate}
          valueSuffix="%"
          sub="across all announcements"
          valueClass="text-green-600 dark:text-green-400"
          icon={
            <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          }
        />
      </div>

      {/* List card */}
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium">All announcements</p>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Manage your broadcast messages
        </p>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search announcements…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium">No announcements</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {announcements.length === 0
                ? 'Get started by creating your first announcement.'
                : 'No announcements match your search.'}
            </p>
            {announcements.length === 0 && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background mx-auto hover:opacity-90"
              >
                <Plus className="h-3 w-3" />
                New announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((a) => {
              const rate = readRate(a);
              const isHigh = a.priority === 'high';
              return (
                <div
                  key={a.$id}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-lg border p-4',
                    isHigh && 'border-l-2 border-l-red-500'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {/* Title + badges */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{a.title}</span>
                      <TypeBadge type={a.type as AnnouncementType} />
                      <PriorityBadge priority={a.priority} />
                    </div>

                    {/* Message preview */}
                    <p className="mb-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {a.message}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {a.sentTo} owners
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3" />
                        {a.readBy} read
                        <ReadBar rate={rate} />
                        {rate}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isPending}
                        className="flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                        <span className="sr-only">Actions</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Send className="mr-2 h-4 w-4" />
                        Resend
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(a.$id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose dialog — kept as shadcn for complex interactive form */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>
              Send a message to all owners in your association
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="grid gap-1.5">
              <Label htmlFor="ann-title">Title</Label>
              <input
                id="ann-title"
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Message */}
            <div className="grid gap-1.5">
              <Label htmlFor="ann-message">Message</Label>
              <Textarea
                id="ann-message"
                placeholder="Write your announcement message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            {/* Type + Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <select
                  value={notificationType}
                  onChange={(e) =>
                    setNotificationType(e.target.value as AnnouncementType)
                  }
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="announcement">Announcement</option>
                  <option value="compliance">Compliance</option>
                  <option value="payment">Payment</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as NotificationPriority)
                  }
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Delivery channels */}
            <div className="space-y-2">
              <Label>Delivery channels</Label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">
                    Send via email to all owners
                  </p>
                </div>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">SMS</p>
                  <p className="text-xs text-muted-foreground">
                    Additional charges apply
                  </p>
                </div>
                <Switch checked={sendSms} onCheckedChange={setSendSms} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send announcement
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  valueSuffix,
  valueClass,
  icon,
}: {
  label: string;
  value: number | null;
  sub: string;
  valueSuffix?: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {value === null ? (
        <Skeleton className="h-7 w-10" />
      ) : (
        <div className={cn('text-2xl font-semibold leading-none', valueClass)}>
          {value}{valueSuffix}
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}