import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Edit, Car, CheckCircle2, XCircle, List, MapPin, Route as RouteIcon } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getRouteById } from '@/lib/appwrite/collections/routes';
import { getRouteAssignmentsByRoute } from '@/lib/appwrite/collections/routeAssignment';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect, notFound } from 'next/navigation';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Route Details' };

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getLookupData(tenantId: string) {
  const { databases } = createAdminClient();
  const [vehiclesRes, ownersRes] = await Promise.all([
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.VEHICLES, [Query.equal('tenantId', tenantId)]),
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.OWNERS,   [Query.equal('tenantId', tenantId)]),
  ]);
  const vehicles = vehiclesRes.documents.map((v: any) => ({ $id: v.$id, registrationNumber: v.registrationNumber }));
  const owners   = ownersRes.documents.map((o: any)  => ({ $id: o.$id, name: `${o.firstName} ${o.lastName}` }));
  return { vehicles, owners };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      active
        ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
        : 'bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', active ? 'bg-green-600' : 'bg-red-600')} />
      {active ? 'Active' : 'Inactive'}
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; routeId: string }>;
}) {
  const { tenantId, routeId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const route = await getRouteById(routeId);
  if (!route) notFound();

  const [assignments, { vehicles, owners }] = await Promise.all([
    getRouteAssignmentsByRoute(routeId),
    getLookupData(tenantId),
  ]);

  const vehicleMap = new Map(vehicles.map(v => [v.$id, v.registrationNumber]));
  const ownerMap   = new Map(owners.map(o   => [o.$id, o.name]));

  const enrichedAssignments = assignments.map(a => ({
    ...a,
    vehicleReg: vehicleMap.get(a.vehicleId) ?? 'Unknown',
    ownerName:  ownerMap.get(a.ownerId)     ?? 'Unknown',
  }));

  // getRouteById already parses stops — do NOT re-parse; just guard the type
  const stops: any[] = Array.isArray(route.stops) ? route.stops : [];

  const capacityPct = route.maxVehicles > 0
    ? (route.currentVehicleCount / route.maxVehicles) * 100
    : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenant/${tenantId}/routes`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{route.name}</h1>
              <StatusPill status={route.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Route <span className="font-mono">{route.code}</span>
              {' · '}
              {route.origin} → {route.destination}
            </p>
          </div>
        </div>
        <Link
          href={`/tenant/${tenantId}/routes/${routeId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit route
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          {/* Route details card */}
          <div className="overflow-hidden rounded-xl border border-l-[3px] border-l-blue-500 bg-card">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-medium">Route details</p>
            </div>
            <div className="px-5 py-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Distance</dt>
                  <dd className="mt-1 font-medium tabular-nums">{route.distance} km</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Base fare</dt>
                  <dd className="mt-1"><MonoPill>R {route.baseFare}</MonoPill></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {new Date(route.createdAt).toLocaleDateString('en-ZA')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vehicles</dt>
                  <dd className={cn('mt-1 font-medium tabular-nums', capacityPct >= 100 ? 'text-red-700 dark:text-red-400' : capacityPct >= 70 ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400')}>
                    {route.currentVehicleCount} / {route.maxVehicles}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Stops</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {stops.length > 0 ? `${stops.length} stop${stops.length !== 1 ? 's' : ''}` : 'None'}
                  </dd>
                </div>
              </dl>

              {/* Endpoint row */}
              <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Origin</p>
                    <p className="font-medium">{route.origin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-medium">{route.destination}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stops card — only rendered when stops exist */}
          {stops.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-l-[3px] border-l-amber-500 bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <List className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Intermediate stops</p>
                <span className="ml-auto text-xs text-muted-foreground">{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y">
                {stops.map((stop: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium tabular-nums text-muted-foreground">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{stop.name ?? `Stop ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{stop.address}</p>
                      </div>
                    </div>
                    <MonoPill>R {stop.fareFromOrigin.toFixed(2)}</MonoPill>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned vehicles */}
          <div className="overflow-hidden rounded-xl border border-l-[3px] border-l-green-600 bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <p className="text-sm font-medium">Assigned vehicles</p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {enrichedAssignments.length} vehicle{enrichedAssignments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {enrichedAssignments.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No vehicles assigned to this route yet.
              </div>
            ) : (
              <div className="divide-y">
                {enrichedAssignments.map(ass => (
                  <div
                    key={ass.$id}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                        <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <MonoPill>{ass.vehicleReg}</MonoPill>
                        <p className="mt-0.5 text-xs text-muted-foreground">{ass.ownerName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Assigned {new Date(ass.assignedAt).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-medium">Quick actions</p>
            </div>
            <div className="flex flex-col gap-2 px-5 py-4">
              <Link
                href={`/tenant/${tenantId}/assignments/new?routeId=${routeId}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3.5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <Car className="h-3.5 w-3.5" />
                Assign vehicle
              </Link>
              <Link
                href={`/tenant/${tenantId}/routes/${routeId}/edit`}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit route
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}