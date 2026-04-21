import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Trash2, User, Car, Star } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getOwnerAssignmentsAction } from '../actions';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Driver Assignments' };

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getOwnerId(tenantId: string, userId: string): Promise<string | null> {
  const { databases } = createAdminClient();
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.OWNERS,
      [Query.equal('tenantId', tenantId), Query.equal('userId', userId), Query.limit(1)]
    );
    return response.documents[0]?.$id ?? null;
  } catch { return null; }
}

async function getDriversAndVehicles(ownerId: string) {
  const { databases } = createAdminClient();
  const [driversRes, vehiclesRes] = await Promise.all([
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.DRIVERS,  [Query.equal('ownerId', ownerId)]),
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.VEHICLES, [Query.equal('ownerId', ownerId)]),
  ]);
  const drivers  = driversRes.documents.map((d: any)  => ({ $id: d.$id, firstName: d.firstName, lastName: d.lastName }));
  const vehicles = vehiclesRes.documents.map((v: any) => ({ $id: v.$id, registrationNumber: v.registrationNumber }));
  return { drivers, vehicles };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AssignmentsPage({
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

  const result      = await getOwnerAssignmentsAction(tenantId);
  const assignments = result.success && Array.isArray(result.data) ? result.data : [];
  const { drivers, vehicles } = await getDriversAndVehicles(ownerId);

  const driversMap  = new Map(drivers.map((d: any)  => [d.$id, `${d.firstName} ${d.lastName}`]));
  const vehiclesMap = new Map(vehicles.map((v: any) => [v.$id, v.registrationNumber]));

  const enriched = assignments.map((a: any) => ({
    ...a,
    driverName:  driversMap.get(a.driverId)   ?? 'Unknown',
    vehicleReg:  vehiclesMap.get(a.vehicleId) ?? 'Unknown',
    initials:    (() => {
      const name = driversMap.get(a.driverId) ?? '';
      const parts = name.split(' ');
      return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
    })(),
  }));

  const primaryCount = enriched.filter((a: any) => a.isPrimary).length;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Driver assignments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Assign drivers to vehicles and manage primary drivers
          </p>
        </div>
        <Link
          href={`/owner/${tenantId}/assignments/new`}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          New assignment
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total assignments</span>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">{enriched.length}</div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Primary drivers</span>
            <Star className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-amber-600 dark:text-amber-400">
            {primaryCount}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Vehicles assigned</span>
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {new Set(enriched.map((a: any) => a.vehicleId)).size}
          </div>
        </div>
      </div>

      {/* Assignments card */}
      <div className="overflow-hidden rounded-xl border bg-card">

        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Current assignments</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Drivers currently assigned to your vehicles</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {enriched.length} assignment{enriched.length !== 1 ? 's' : ''}
          </span>
        </div>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No assignments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create your first driver–vehicle assignment.</p>
            </div>
            <Link
              href={`/owner/${tenantId}/assignments/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New assignment
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {enriched.map((assignment: any) => (
              <div
                key={assignment.$id}
                className={cn(
                  'flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30',
                  assignment.isPrimary
                    ? 'border-l-[3px] border-l-amber-500'
                    : 'border-l-[3px] border-l-transparent'
                )}
              >
                {/* Driver + vehicle */}
                <div className="flex items-center gap-3">
                  {/* Initials avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {assignment.initials.toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{assignment.driverName}</span>
                      {assignment.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          <Star className="h-2.5 w-2.5" />
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Car className="h-3 w-3 shrink-0" />
                      <span className="font-mono tracking-wider">{assignment.vehicleReg}</span>
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <form action={async () => {
                  'use server';
                  const { unassignDriverAction } = await import('../actions');
                  await unassignDriverAction(tenantId, assignment.$id);
                  redirect(`/owner/${tenantId}/assignments`);
                }}>
                  <button
                    type="submit"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    title="Remove assignment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}