import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect, notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Driver Details' };

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

async function getDriver(ownerId: string, driverId: string) {
  const { databases } = createAdminClient();
  try {
    const res = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.DRIVERS,
      [Query.equal('ownerId', ownerId), Query.equal('$id', driverId), Query.limit(1)]
    );
    return res.documents[0] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Compliance helpers
// ---------------------------------------------------------------------------

type ExpiryState = 'ok' | 'soon' | 'expired' | 'none';

function expiryState(d?: string): ExpiryState {
  if (!d) return 'none';
  const now = Date.now();
  const ts = new Date(d).getTime();
  if (ts < now) return 'expired';
  const days = Math.ceil((ts - now) / (1000 * 60 * 60 * 24));
  return days <= 30 ? 'soon' : 'ok';
}

function ExpiryPill({ state }: { state: ExpiryState }) {
  if (state === 'none' || state === 'ok') return null;
  return (
    <span
      className={cn(
        'ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        state === 'expired'
          ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
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
    inactive: 'bg-muted text-muted-foreground',
    suspended: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        map[status] ?? 'bg-muted text-muted-foreground'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
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

export default async function OwnerDriverDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; driverId: string }>;
}) {
  const { tenantId, driverId } = await params;
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

  const driver = await getDriver(ownerId, driverId);
  if (!driver) notFound();

  const d = driver as any;
  const prdpState = expiryState(d.prdpExpiry);
  const licenseState = expiryState(d.driverLicenseExpiry);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/owner/${tenantId}/drivers`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver details</h1>
          <p className="text-sm text-muted-foreground">
            {d.firstName} {d.lastName}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          {/* Personal info */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Personal information</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="First name">{d.firstName}</InfoRow>
              <InfoRow label="Last name">{d.lastName}</InfoRow>
              <InfoRow label="ID number">
                <span className="font-mono">{d.idNumber}</span>
              </InfoRow>
              <InfoRow label="Status">
                <StatusBadge status={d.status} />
              </InfoRow>
            </div>
          </div>

          {/* Licensing */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Licensing & permits</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="PrDP number">
                <span className="font-mono">{d.prdpNumber || '—'}</span>
              </InfoRow>
              <InfoRow label="PrDP expiry">
                {d.prdpExpiry
                  ? new Date(d.prdpExpiry).toLocaleDateString('en-ZA')
                  : '—'}
                <ExpiryPill state={prdpState} />
              </InfoRow>
              <InfoRow label="Licence number">
                <span className="font-mono">{d.driverLicenseNumber || '—'}</span>
              </InfoRow>
              <InfoRow label="Licence expiry">
                {d.driverLicenseExpiry
                  ? new Date(d.driverLicenseExpiry).toLocaleDateString('en-ZA')
                  : '—'}
                <ExpiryPill state={licenseState} />
              </InfoRow>
              <InfoRow label="Licence code">
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">
                  {d.driverLicenseCode}
                </span>
              </InfoRow>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Actions</p>
            <div className="space-y-2">
              <Link href={`/owner/${tenantId}/drivers/${d.$id}/edit`}>
                <button className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Edit className="h-4 w-4" />
                  Edit driver
                </button>
              </Link>
              <button
                disabled
                className="flex w-full cursor-not-allowed items-center gap-2 rounded-md border border-border px-3 py-2 text-sm opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete driver
                <span className="ml-auto text-xs text-muted-foreground">
                  (coming soon)
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Contact</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                {d.phone}
              </div>
              {d.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  {d.email}
                </div>
              )}
              {d.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  {d.address}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}