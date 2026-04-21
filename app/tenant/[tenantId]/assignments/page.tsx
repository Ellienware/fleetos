import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Car, CheckCircle2, XCircle, Edit } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getAllRouteAssignmentsAction, revokeRouteAssignmentAction } from '../actions';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Route Assignments' };
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getLookupData(tenantId: string) {
  const { databases } = createAdminClient();
  const [routesRes, vehiclesRes, ownersRes] = await Promise.all([
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.ROUTES,   [Query.equal('tenantId', tenantId)]),
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.VEHICLES, [Query.equal('tenantId', tenantId)]),
    databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.OWNERS,   [Query.equal('tenantId', tenantId)]),
  ]);
  const routes   = routesRes.documents.map((r: any) => ({ $id: r.$id, name: r.name, code: r.code }));
  const vehicles = vehiclesRes.documents.map((v: any) => ({ $id: v.$id, registrationNumber: v.registrationNumber }));
  const owners   = ownersRes.documents.map((o: any) => ({ $id: o.$id, name: `${o.firstName} ${o.lastName}` }));
  return { routes, vehicles, owners };
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
      {active ? 'Active' : 'Revoked'}
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

export default async function RouteAssignmentsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const result      = await getAllRouteAssignmentsAction(tenantId);
  const assignments = result.success && result.data ? result.data : [];
  const { routes, vehicles, owners } = await getLookupData(tenantId);

  const routesMap   = new Map(routes.map(r   => [r.$id, r]));
  const vehiclesMap = new Map(vehicles.map(v => [v.$id, v]));
  const ownersMap   = new Map(owners.map(o   => [o.$id, o]));

  const enriched = assignments.map((a: any) => ({
    ...a,
    routeName:  routesMap.get(a.routeId)?.name                         ?? 'Unknown',
    routeCode:  routesMap.get(a.routeId)?.code                         ?? '',
    vehicleReg: vehiclesMap.get(a.vehicleId)?.registrationNumber       ?? 'Unknown',
    ownerName:  ownersMap.get(a.ownerId)?.name                         ?? 'Unknown',
  }));

  const stats = {
    total:   enriched.length,
    active:  enriched.filter((a: any) => a.status === 'active').length,
    revoked: enriched.filter((a: any) => a.status !== 'active').length,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Route assignments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage which vehicles are assigned to which routes
          </p>
        </div>
        <Link
          href={`/tenant/${tenantId}/assignments/new`}
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
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-green-700 dark:text-green-400">
            {stats.active}
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Revoked</span>
            <XCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
          </div>
          <div className="text-2xl font-semibold leading-none tabular-nums text-red-700 dark:text-red-400">
            {stats.revoked}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">All assignments</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Vehicles currently assigned to routes</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {enriched.length} assignment{enriched.length !== 1 ? 's' : ''}
          </span>
        </div>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Car className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No route assignments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Assign a vehicle to a route to get started.</p>
            </div>
            <Link
              href={`/tenant/${tenantId}/assignments/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New assignment
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Vehicle', 'Route', 'Owner', 'Status', 'Assigned on', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {enriched.map((a: any) => (
                <tr
                  key={a.$id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    a.status === 'active'
                      ? 'border-l-[3px] border-l-green-600'
                      : 'border-l-[3px] border-l-red-600'
                  )}
                >
                  {/* Vehicle */}
                  <td className="px-4 py-3 pl-5">
                    <MonoPill>{a.vehicleReg}</MonoPill>
                  </td>

                  {/* Route */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-[11px] font-semibold tracking-wide">
                        {a.routeCode}
                      </div>
                      <span className="text-sm">{a.routeName}</span>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.ownerName}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(a.assignedAt).toLocaleDateString('en-ZA')}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/tenant/${tenantId}/assignments/${a.$id}/edit`}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Edit assignment"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                      <form action={async () => {
                        'use server';
                        await revokeRouteAssignmentAction(tenantId, a.$id, a.routeId);
                        redirect(`/tenant/${tenantId}/assignments`);
                      }}>
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                          title="Revoke assignment"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
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