import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Car, Shield, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect, notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Vehicle Details' };

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function getOwnerId(tenantId: string, userId: string): Promise<string | null> {
  const { databases } = createAdminClient();
  try {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.OWNERS,
      [Query.equal('tenantId', tenantId), Query.equal('userId', userId), Query.limit(1)]
    );
    return res.documents[0]?.$id ?? null;
  } catch {
    return null;
  }
}

async function getVehicle(ownerId: string, vehicleId: string) {
  const { databases } = createAdminClient();
  try {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.VEHICLES,
      [Query.equal('ownerId', ownerId), Query.equal('$id', vehicleId), Query.limit(1)]
    );
    return res.documents[0] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Compliance helpers
// ---------------------------------------------------------------------------

function isExpired(d?: string) {
  return d ? new Date(d) < new Date() : false;
}
function isExpiringSoon(d?: string) {
  if (!d) return false;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days > 0 && days <= 30;
}

type ExpiryState = 'ok' | 'soon' | 'expired' | 'none';

function expiryState(d?: string): ExpiryState {
  if (!d) return 'none';
  if (isExpired(d)) return 'expired';
  if (isExpiringSoon(d)) return 'soon';
  return 'ok';
}

function ExpiryPill({ state }: { state: ExpiryState }) {
  if (state === 'none' || state === 'ok') return null;
  const styles = {
    expired: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    soon: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  };
  return (
    <span
      className={cn(
        'ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        styles[state as 'expired' | 'soon']
      )}
    >
      {state === 'expired' ? 'Expired' : 'Expiring soon'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
    maintenance: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    inactive: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    pending: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        map[status] ?? 'bg-muted text-muted-foreground'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status === 'pending' ? 'Pending approval' : status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Info row
// ---------------------------------------------------------------------------

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center text-sm font-medium">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerVehicleDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; vehicleId: string }>;
}) {
  const { tenantId, vehicleId } = await params;
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

  const vehicle = await getVehicle(ownerId, vehicleId);
  if (!vehicle) notFound();

  const v = vehicle as any;
  const permitState = expiryState(v.operatingPermitExpiry);
  const insuranceState = expiryState(v.insuranceExpiry);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/owner/${tenantId}/vehicles`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle details</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {v.registrationNumber}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          {/* Vehicle info */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Vehicle information</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Registration">
                <span className="font-mono">{v.registrationNumber}</span>
              </InfoRow>
              <InfoRow label="Status">
                <StatusBadge status={v.status} />
              </InfoRow>
              <InfoRow label="Make">{v.make}</InfoRow>
              <InfoRow label="Model">{v.model}</InfoRow>
              <InfoRow label="Year">{v.year}</InfoRow>
              <InfoRow label="Capacity">{v.capacity} passengers</InfoRow>
            </div>
          </div>

          {/* Compliance */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Compliance & documents</p>
            </div>
            <div className="space-y-4">
              <InfoRow label="Operating permit number">
                <span className="font-mono">{v.operatingPermitNumber || '—'}</span>
              </InfoRow>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Permit expiry">
                  {v.operatingPermitExpiry
                    ? new Date(v.operatingPermitExpiry).toLocaleDateString('en-ZA')
                    : '—'}
                  <ExpiryPill state={permitState} />
                </InfoRow>
                <InfoRow label="Insurance expiry">
                  {v.insuranceExpiry
                    ? new Date(v.insuranceExpiry).toLocaleDateString('en-ZA')
                    : '—'}
                  <ExpiryPill state={insuranceState} />
                </InfoRow>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Actions</p>
            <div className="space-y-2">
              <Link href={`/owner/${tenantId}/vehicles/${v.$id}/edit`}>
                <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Edit className="h-4 w-4" />
                  Edit vehicle
                </button>
              </Link>
              <button
                disabled
                className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete vehicle
                <span className="ml-auto text-xs">(coming soon)</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Quick info</p>
            <div className="space-y-0">
              {[
                {
                  label: 'Added on',
                  value: new Date(v.createdAt).toLocaleDateString('en-ZA'),
                },
                {
                  label: 'Last updated',
                  value: new Date(v.updatedAt).toLocaleDateString('en-ZA'),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b py-2.5 last:border-none last:pb-0 first:pt-0"
                >
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}