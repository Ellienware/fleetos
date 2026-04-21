import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Users, Bus, AlertTriangle, CreditCard, Route, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOwnersByTenant } from '@/lib/appwrite/collections/owners';
import { getVehiclesByTenant } from '@/lib/appwrite/collections/vehicles';
import { getRoutesByTenant } from '@/lib/appwrite/collections/routes';
import { getPendingFinesCount } from '@/lib/appwrite/collections/fines';
import { getFinesByTenant } from '@/lib/appwrite/collections/fines';

export const metadata: Metadata = { title: 'Dashboard' };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Owner {
  $id: string;
  firstName: string;
  lastName: string;
  membershipStatus: string;
  joinedAt: string;          // correct field, not joinDate
  // vehicles not included, no outstandingBalance
}

interface Vehicle {
  $id: string;
  registrationNumber: string;
  status: string;
  operatingPermitExpiry: string;   // correct field name
  ownerId: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [ownersResult, vehiclesResult, routesResult, pendingFinesCount] =
    await Promise.all([
      getOwnersByTenant(tenantId, 1, 100).catch(() => ({ documents: [], total: 0 })),
      getVehiclesByTenant(tenantId, 1, 100).catch(() => ({ documents: [], total: 0 })),
      getRoutesByTenant(tenantId, 1, 100).catch(() => ({ documents: [], total: 0 })),
      getPendingFinesCount(tenantId).catch(() => 0),
    ]);

  const owners   = (ownersResult.documents  ?? []) as Owner[];
  const vehicles = (vehiclesResult.documents ?? []) as Vehicle[];

  const ownerMap = new Map<string, string>(
    owners.map((o) => [o.$id, `${o.firstName} ${o.lastName}`])
  );

  const activeVehicles = vehicles.filter((v) => v.status === 'active').length;

  // Recent owners – sorted by joinedAt (most recent first)
  const recentOwners = owners
    .slice()
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 4)
    .map((o) => ({
      id: o.$id,
      name: `${o.firstName} ${o.lastName}`,
      initials: `${o.firstName[0]}${o.lastName[0]}`.toUpperCase(),
      status: o.membershipStatus,
      // vehicle count removed – not available in owner object
    }));

  const today           = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Upcoming expirations – using operatingPermitExpiry
  const upcomingExpirations = vehicles
    .filter((v) => {
      const expiry = new Date(v.operatingPermitExpiry);
      return expiry > today && expiry <= thirtyDaysFromNow;
    })
    .sort((a, b) =>
      new Date(a.operatingPermitExpiry).getTime() -
      new Date(b.operatingPermitExpiry).getTime()
    )
    .slice(0, 3)
    .map((v) => {
      const daysUntil = Math.ceil(
        (new Date(v.operatingPermitExpiry).getTime() - today.getTime()) / 86400000
      );
      return {
        id: v.$id,
        registration: v.registrationNumber,
        ownerName: ownerMap.get(v.ownerId) ?? 'Unknown owner',
        daysUntil,
      };
    });

  // Compute pending payments – since owner doesn't have outstandingBalance,
  // we'll use pending fines total for now (or you could fetch payments).
  // For simplicity, show "No outstanding balances" because we don't have that data.
  const pendingPayments: any[] = []; // empty for now

  const quickActions = [
    { href: `/tenant/${tenantId}/owners/new`,   label: 'Add owner',        icon: Users,         iconBg: 'bg-blue-50  dark:bg-blue-950',  iconColor: 'text-blue-600  dark:text-blue-400'  },
    { href: `/tenant/${tenantId}/vehicles/new`, label: 'Register vehicle', icon: Bus,           iconBg: 'bg-teal-50  dark:bg-teal-950',  iconColor: 'text-teal-600  dark:text-teal-400'  },
    { href: `/tenant/${tenantId}/fines`,        label: 'Manage fines',     icon: AlertTriangle, iconBg: 'bg-red-50   dark:bg-red-950',   iconColor: 'text-red-600   dark:text-red-400'   },
    { href: `/tenant/${tenantId}/membership`,   label: 'View payments',    icon: CreditCard,    iconBg: 'bg-amber-50 dark:bg-amber-950', iconColor: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Overview of your taxi association operations.
        </p>
      </div>

      {/* Stat cards — 5-col on lg */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total owners"
          value={ownersResult.total}
          sub={`${owners.filter(o => o.membershipStatus === 'active').length} active`}
          icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Total vehicles"
          value={vehiclesResult.total}
          sub={`${activeVehicles} active`}
          icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Routes"
          value={routesResult.total}
          sub="active routes"
          icon={<Route className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Pending fines"
          value={pendingFinesCount}
          sub="require attention"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
          valueClass="text-red-700 dark:text-red-400"
          accent="danger"
        />
        <StatCard
          label="Outstanding"
          value={pendingPayments.length}
          sub="unpaid balances"
          icon={<CreditCard className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
          valueClass="text-amber-700 dark:text-amber-400"
          accent="warning"
        />
      </div>

      {/* Row 1 */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DashCard
          title="Recent owners"
          description="Latest members to join"
          viewAllHref={`/tenant/${tenantId}/owners`}
          empty={recentOwners.length === 0}
          emptyMessage="No owners registered yet"
        >
          {recentOwners.map((owner) => (
            <ListRow key={owner.id}>
              <div className="flex items-center gap-3">
                <InitialsAvatar initials={owner.initials} color="blue" />
                <div>
                  <p className="text-sm font-medium leading-tight">{owner.name}</p>
                  {/* vehicle count removed – not available */}
                </div>
              </div>
              <StatusPill status={owner.status} />
            </ListRow>
          ))}
        </DashCard>

        <DashCard
          title="Upcoming expirations"
          description="Operating permits expiring within 30 days"
          viewAllHref={`/tenant/${tenantId}/vehicles`}
          empty={upcomingExpirations.length === 0}
          emptyMessage="No upcoming expirations"
        >
          {upcomingExpirations.map((item) => (
            <ListRow key={item.id}>
              <div className="flex items-center gap-3">
                <CalendarAvatar daysUntil={item.daysUntil} />
                <div>
                  <p className="text-sm font-medium leading-tight">{item.registration}</p>
                  <p className="text-xs text-muted-foreground">{item.ownerName}</p>
                </div>
              </div>
              <ExpiryPill daysUntil={item.daysUntil} />
            </ListRow>
          ))}
        </DashCard>
      </div>

      {/* Row 2 */}
      <div className="grid gap-5 lg:grid-cols-2">
      <DashCard
        title="Outstanding balances"
        description="Owners with pending payments"
        viewAllHref={`/tenant/${tenantId}/membership`}
        empty={true}
        emptyMessage="No outstanding balances"
      >
        <></>
      </DashCard>

        {/* Quick actions */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <p className="text-sm font-medium">Quick actions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Common tasks</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-5">
            {quickActions.map(({ href, label, icon: Icon, iconBg, iconColor }) => (
              <Link key={href} href={href}>
                <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconBg)}>
                    <Icon className={cn('h-3.5 w-3.5', iconColor)} />
                  </div>
                  {label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (unchanged except StatCard and ListRow)
// ---------------------------------------------------------------------------

function StatCard({
  label, value, sub, icon, valueClass, accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon?: React.ReactNode;
  valueClass?: string;
  accent?: 'danger' | 'warning';
}) {
  return (
    <div className={cn(
      'rounded-lg bg-muted/60 px-4 py-3',
      accent === 'danger'  && 'border-l-[3px] border-l-red-600',
      accent === 'warning' && 'border-l-[3px] border-l-amber-500',
    )}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={cn('text-2xl font-semibold leading-none tabular-nums', valueClass)}>
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashCard({
  title, description, viewAllHref, empty, emptyMessage, children,
}: {
  title: string;
  description: string;
  viewAllHref: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between border-b px-5 py-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="px-5 py-2">
        {empty ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </div>
    </div>
  );
}

function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between py-3">
      {children}
    </li>
  );
}

const PILL_STYLES = {
  active:   { dot: 'bg-green-600', pill: 'bg-green-50  text-green-900  dark:bg-green-950 dark:text-green-100',  label: 'Active'    },
  suspended:{ dot: 'bg-red-600',   pill: 'bg-red-50    text-red-900    dark:bg-red-950   dark:text-red-100',    label: 'Suspended' },
  pending:  { dot: 'bg-amber-500', pill: 'bg-amber-50  text-amber-900  dark:bg-amber-950 dark:text-amber-100',  label: 'Pending'   },
} as const;

function StatusPill({ status }: { status: string }) {
  const s = PILL_STYLES[status as keyof typeof PILL_STYLES] ?? {
    dot: 'bg-muted-foreground', pill: 'bg-muted text-muted-foreground', label: status,
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function ExpiryPill({ daysUntil }: { daysUntil: number }) {
  const variant =
    daysUntil <= 7  ? 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100'   :
    daysUntil <= 14 ? 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100' :
                      'bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tabular-nums', variant)}>
      {daysUntil}d
    </span>
  );
}

const AVATAR_COLORS = {
  blue:  'bg-blue-50  text-blue-800  dark:bg-blue-950  dark:text-blue-200',
  red:   'bg-red-50   text-red-800   dark:bg-red-950   dark:text-red-200',
  teal:  'bg-teal-50  text-teal-800  dark:bg-teal-950  dark:text-teal-200',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
} as const;

function InitialsAvatar({ initials, color }: { initials: string; color: keyof typeof AVATAR_COLORS }) {
  return (
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium', AVATAR_COLORS[color])}>
      {initials}
    </div>
  );
}

function CalendarAvatar({ daysUntil }: { daysUntil: number }) {
  const color: keyof typeof AVATAR_COLORS = daysUntil <= 7 ? 'red' : 'amber';
  return (
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', AVATAR_COLORS[color])}>
      <Calendar className="h-3.5 w-3.5" />
    </div>
  );
}