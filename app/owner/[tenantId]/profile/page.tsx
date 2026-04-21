import type { Metadata } from 'next';
import { User, Phone, Mail, MapPin, IdCard, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { getOwnerById } from '@/lib/appwrite/collections/owners';
import { getTenantById } from '@/lib/appwrite/collections/tenants';
import { getVehiclesByOwner } from '@/lib/appwrite/collections/vehicles';
import { getDriversByOwner } from '@/lib/appwrite/collections/drivers';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { redirect } from 'next/navigation';
import { ProfileEditForm } from '@/components/owner/profile-edit-form';

export const metadata: Metadata = { title: 'My Profile' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOwnerId(
  tenantId: string,
  userId: string
): Promise<string | null> {
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
    pending:
      'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    suspended:
      'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status] ?? 'bg-muted text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'active'
            ? 'bg-green-500'
            : status === 'pending'
            ? 'bg-yellow-500'
            : 'bg-red-500'
        )}
      />
      {status}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  span2,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-3', span2 && 'sm:col-span-2')}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-medium', mono && 'font-mono')}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OwnerProfilePage({
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

  const [owner, tenant, vehicles, driversResult] = await Promise.all([
    getOwnerById(ownerId).catch(() => null),
    getTenantById(tenantId).catch(() => null),
    getVehiclesByOwner(ownerId).catch(() => []),
    getDriversByOwner(ownerId).catch(() => ({ documents: [], total: 0 })),
  ]);

  const drivers = (driversResult as any).documents ?? [];

  if (!owner) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Owner record not found.
      </p>
    );
  }

  const o = owner as any;
  const t = tenant as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">
          View and update your profile information.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile card */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border bg-card p-5">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">
                    {o.firstName} {o.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Member of {t?.name ?? 'Association'}
                  </p>
                </div>
              </div>
              <StatusBadge status={o.membershipStatus} />
            </div>

            {/* Identity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={IdCard}
                label="ID number"
                value={o.idNumber}
                mono
              />
              <InfoRow
                icon={Calendar}
                label="Member since"
                value={new Date(
                  o.joinedAt ?? o.createdAt
                ).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </div>

            <div className="my-5 h-px bg-border" />

            {/* Contact */}
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Contact information
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Phone} label="Phone" value={o.phone} />
              <InfoRow icon={Mail} label="Email" value={o.email} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={o.address}
                span2
              />
            </div>

            <div className="my-5 h-px bg-border" />

            {/* Edit form */}
            <ProfileEditForm
              ownerId={ownerId}
              tenantId={tenantId}
              initialData={{
                phone: o.phone,
                email: o.email,
                address: o.address,
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Fleet overview</p>
            <div className="space-y-0">
              <div className="flex items-center justify-between border-b py-2.5 last:border-none last:pb-0 first:pt-0">
                <span className="text-sm text-muted-foreground">Vehicles</span>
                <span className="text-sm font-medium">
                  {(vehicles as any[]).length}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Drivers</span>
                <span className="text-sm font-medium">{drivers.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Association details</p>
            <div className="space-y-0">
              {[
                { label: 'Name', value: t?.name ?? 'N/A' },
                {
                  label: 'Monthly fee',
                  value: `R${
                    t?.settings?.membershipFee?.toLocaleString('en-ZA') ?? '0'
                  }`,
                },
                { label: 'Contact', value: t?.phone ?? 'N/A' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b py-2.5 last:border-none last:pb-0 first:pt-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}