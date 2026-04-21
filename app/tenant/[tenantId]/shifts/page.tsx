import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  Calendar,
  Clock,
  Bus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getSession } from '@/lib/auth/session';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { ShiftsViewClient } from './shifts-view-client';

export const metadata: Metadata = {
  title: 'Shifts',
};
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
async function getShiftsData(tenantId: string) {
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  try {
    const [shiftsRes, driversRes, vehiclesRes, routesRes, ownersRes] =
      await Promise.all([
        databases.listDocuments(databaseId, COLLECTIONS.SHIFTS, [
          Query.equal('tenantId', tenantId),
          Query.orderDesc('startTime'),
          Query.limit(500),
        ]),
        databases.listDocuments(databaseId, COLLECTIONS.DRIVERS, [
          Query.equal('tenantId', tenantId),
          Query.limit(500),
        ]),
        databases.listDocuments(databaseId, COLLECTIONS.VEHICLES, [
          Query.equal('tenantId', tenantId),
          Query.limit(500),
        ]),
        databases.listDocuments(databaseId, COLLECTIONS.ROUTES, [
          Query.equal('tenantId', tenantId),
          Query.limit(100),
        ]),
        databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
          Query.equal('tenantId', tenantId),
          Query.limit(500),
        ]),
      ]);

    const driversMap  = new Map(driversRes.documents.map((d: any) => [d.$id, d]));
    const vehiclesMap = new Map(vehiclesRes.documents.map((v: any) => [v.$id, v]));
    const routesMap   = new Map(routesRes.documents.map((r: any) => [r.$id, r]));
    const ownersMap   = new Map(ownersRes.documents.map((o: any) => [o.$id, o]));

      const enrichedShifts = shiftsRes.documents.map((shift: any) => ({
        ...shift,
        driver:  driversMap.get(shift.driverId)   || null,
        vehicle: vehiclesMap.get(shift.vehicleId) || null,
        route:   shift.routeId ? routesMap.get(shift.routeId) : null,
        owner:   ownersMap.get(shift.ownerId)     || null,
      }));

    const stats = shiftsRes.documents.reduce(
      (acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 }
    );

    return {
 shifts: toPlainObject(enrichedShifts),
  drivers: toPlainObject(driversRes.documents),
  vehicles: toPlainObject(vehiclesRes.documents),
  routes: toPlainObject(routesRes.documents),
      stats: {
        total:      shiftsRes.total,
        scheduled:  stats.scheduled  ?? 0,
        inProgress: stats.in_progress ?? 0,
        completed:  stats.completed  ?? 0,
        cancelled:  stats.cancelled  ?? 0,
      },
    };
  } catch (error) {
    console.error('Error fetching shifts data:', error);
    return {
      shifts: [],
      drivers: [],
      vehicles: [],
      routes: [],
      stats: { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 },
    };
  }
}

function StatCard({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string;
  value: number;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-semibold leading-none tabular-nums ${valueClass ?? ''}`}>
        {value}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-20" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

export default async function TenantShiftsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const { shifts, stats } = await getShiftsData(tenantId);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            View and manage all shifts across your association
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total shifts"
          value={stats.total}
          icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          icon={<Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
          valueClass="text-blue-700 dark:text-blue-400"
        />
        <StatCard
          label="In progress"
          value={stats.inProgress}
          icon={<Bus className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
          valueClass="text-green-700 dark:text-green-400"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
          valueClass="text-red-700 dark:text-red-400"
        />
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <p className="text-sm font-medium">All shifts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            View shifts in calendar or list format
          </p>
        </div>

        <div className="p-5">
          <Suspense fallback={<CalendarSkeleton />}>
            <ShiftsViewClient shifts={shifts} tenantId={tenantId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}