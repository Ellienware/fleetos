import type { Metadata } from 'next';
import { Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Announcements' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year:
      date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

const priorityConfig: Record<
  string,
  { icon: React.ElementType; iconClass: string; leftBorder: string }
> = {
  high: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    leftBorder: 'border-l-2 border-l-red-500',
  },
  medium: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-500',
    leftBorder: '',
  },
  low: {
    icon: Info,
    iconClass: 'text-muted-foreground',
    leftBorder: '',
  },
};

const typeBadgeClass: Record<string, string> = {
  announcement:
    'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  compliance:
    'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  payment:
    'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
  system: 'bg-muted text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function AnnouncementCard({
  announcement,
  muted,
}: {
  announcement: any;
  muted?: boolean;
}) {
  const cfg = priorityConfig[announcement.priority] ?? priorityConfig.low;
  const Icon = cfg.icon;
  const badgeClass =
    typeBadgeClass[announcement.type] ?? typeBadgeClass.system;

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        cfg.leftBorder,
        cfg.leftBorder && 'rounded-l-none',
        muted && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn('h-4 w-4 flex-shrink-0', cfg.iconClass)} />
          <p className="truncate text-sm font-medium">{announcement.title}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              badgeClass
            )}
          >
            {announcement.type}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(announcement.$createdAt)}
          </span>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
        {announcement.message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerAnnouncementsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const { databases } = createAdminClient();
  let announcements: any[] = [];

  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.isNull('userId'),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]
    );
    announcements = response.documents;
  } catch {
    // silently fallback to empty
  }

  const today = new Date();
  const recent = announcements.filter((a) => {
    const diff = Math.floor(
      (today.getTime() - new Date(a.$createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff <= 7;
  });
  const older = announcements.filter((a) => {
    const diff = Math.floor(
      (today.getTime() - new Date(a.$createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff > 7;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Important updates and notices from your association.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">No announcements</p>
          <p className="mt-1 text-xs text-muted-foreground">
            There are no announcements at this time.
          </p>
        </div>
      ) : (
        <>
          {recent.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Recent</p>
              {recent.map((a) => (
                <AnnouncementCard key={a.$id} announcement={a} />
              ))}
            </div>
          )}
          {older.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Earlier
              </p>
              {older.map((a) => (
                <AnnouncementCard key={a.$id} announcement={a} muted />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}