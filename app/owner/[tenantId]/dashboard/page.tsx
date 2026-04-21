import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bus,
  Users,
  Calendar,
  AlertTriangle,
  CreditCard,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { getVehiclesByOwner } from '@/lib/appwrite/collections/vehicles';
import { getDriversByOwner } from '@/lib/appwrite/collections/drivers';
import { getUpcomingShiftsForOwner } from '@/lib/appwrite/collections/shifts';
import { getFinesByOwner } from '@/lib/appwrite/collections/fines';
import { getOwnerById } from '@/lib/appwrite/collections/owners';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Owner Dashboard' };

// ---------------------------------------------------------------------------
// Helpers
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

const AVATAR_COLORS = [
  'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
] as const;

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function driverInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        isActive
          ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
          : 'bg-muted text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-green-500' : 'bg-muted-foreground'
        )}
      />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerDashboardPage({
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
      <p className="py-12 text-center text-sm text-muted-foreground">
        Owner record not found.
      </p>
    );
  }

  const [owner, vehicles, driversResult, upcomingShifts, fines] =
    await Promise.all([
      getOwnerById(ownerId).catch(() => null),
      getVehiclesByOwner(ownerId).catch(() => []),
      getDriversByOwner(ownerId).catch(() => ({ documents: [], total: 0 })),
      getUpcomingShiftsForOwner(ownerId, 5).catch(() => []),
      getFinesByOwner(ownerId).catch(() => []),
    ]);

  const drivers = (driversResult as any).documents ?? driversResult ?? [];
  const pendingFines = (fines as any[]).filter((f) => f.status === 'pending');
  const pendingFinesAmount = pendingFines.reduce(
    (sum, f) => sum + (f.amount ?? 0),
    0
  );

  const stats = {
    totalVehicles: (vehicles as any[]).length,
    activeVehicles: (vehicles as any[]).filter((v) => v.status === 'active').length,
    totalDrivers: (drivers as any[]).length,
    activeDrivers: (drivers as any[]).filter((d) => d.status === 'active').length,
    upcomingShifts: (upcomingShifts as any[]).length,
    pendingFines: pendingFines.length,
    pendingFinesAmount,
    membershipStatus: (owner as any)?.membershipStatus ?? 'pending',
  };

  const firstName =
    (owner as any)?.firstName ?? session.name.split(' ')[0];

  const quickActions = [
    { href: `/owner/${tenantId}/vehicles/new`, icon: Bus, label: 'vehicle +' },
    { href: `/owner/${tenantId}/drivers/new`, icon: Users, label: 'driver +' },
    { href: `/owner/${tenantId}/shifts/new`, icon: Calendar, label: 'Schedule shift' },
    { href: `/owner/${tenantId}/payments`, icon: CreditCard, label: 'Make payment' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your fleet and operations.
        </p>
      </div>

      {/* Membership warning */}
      {stats.membershipStatus !== 'active' && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Membership status: {stats.membershipStatus}
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-400/80">
              Please ensure your membership fees are up to date.
            </p>
          </div>
          <Link
            href={`/owner/${tenantId}/payments`}
            className="flex-shrink-0 rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
          >
            View payments
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My vehicles"
          value={stats.totalVehicles}
          sub={`${stats.activeVehicles} active`}
          icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="My drivers"
          value={stats.totalDrivers}
          sub={`${stats.activeDrivers} active`}
          icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Upcoming shifts"
          value={stats.upcomingShifts}
          sub="scheduled this week"
          icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Pending fines"
          value={stats.pendingFines}
          sub={`R${stats.pendingFinesAmount.toLocaleString('en-ZA')} total`}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />}
          accent={stats.pendingFines > 0 ? 'warning' : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* My Vehicles */}
        <DashCard
          title="My vehicles"
          description="Your registered vehicles"
          viewAllHref={`/owner/${tenantId}/vehicles`}
          empty={(vehicles as any[]).length === 0}
          emptyMessage="No vehicles registered yet"
        >
          {(vehicles as any[]).slice(0, 4).map((vehicle) => (
            <ListRow key={vehicle.$id}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium font-mono tracking-wide">
                    {vehicle.registrationNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.make} {vehicle.model}
                  </p>
                </div>
              </div>
              <StatusBadge status={vehicle.status} />
            </ListRow>
          ))}
        </DashCard>

        {/* My Drivers */}
        <DashCard
          title="My drivers"
          description="Drivers assigned to your vehicles"
          viewAllHref={`/owner/${tenantId}/drivers`}
          empty={(drivers as any[]).length === 0}
          emptyMessage="No drivers registered yet"
        >
          {(drivers as any[]).slice(0, 4).map((driver) => (
            <ListRow key={driver.$id}>
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    avatarColor(driver.$id)
                  )}
                >
                  {driverInitials(driver.firstName, driver.lastName)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {driver.firstName} {driver.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{driver.phone}</p>
                </div>
              </div>
              <StatusBadge status={driver.status} />
            </ListRow>
          ))}
        </DashCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Upcoming Shifts */}
        <DashCard
          title="Upcoming shifts"
          description="Scheduled shifts for your drivers"
          viewAllHref={`/owner/${tenantId}/shifts`}
          empty={(upcomingShifts as any[]).length === 0}
          emptyMessage="No upcoming shifts"
        >
          {(upcomingShifts as any[]).map((shift) => {
            const start = new Date(shift.startTime);
            return (
              <ListRow key={shift.$id}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950">
                    <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {start.toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {start.toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {shift.status}
                </span>
              </ListRow>
            );
          })}
        </DashCard>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-1 text-sm font-medium">Quick actions</p>
          <p className="mb-4 text-xs text-muted-foreground">Common tasks</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950 flex-shrink-0">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon?: React.ReactNode;
  accent?: 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-lg bg-muted/50 px-4 py-3',
        accent === 'warning' &&
          'border-l-2 border-yellow-500 dark:border-yellow-400'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold leading-none',
          accent === 'warning' && 'text-yellow-600 dark:text-yellow-400'
        )}
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashCard({
  title,
  description,
  viewAllHref,
  empty,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  viewAllHref: string;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {empty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}

function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between border-b py-2.5 last:border-none last:pb-0 first:pt-0">
      {children}
    </li>
  );
}