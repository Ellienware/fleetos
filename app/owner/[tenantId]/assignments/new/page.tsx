'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, User, Car, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { assignDriverToVehicleAction, getOwnerDriversAction, getOwnerVehiclesAction } from '../../actions';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
  accent,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'blue' | 'green' | 'amber';
}) {
  const stripe = {
    blue:  'border-l-[3px] border-l-blue-500',
    green: 'border-l-[3px] border-l-green-600',
    amber: 'border-l-[3px] border-l-amber-500',
  };
  return (
    <div className={cn(
      'overflow-hidden rounded-xl border bg-card',
      accent ? stripe[accent] : 'border-l-[3px] border-l-transparent'
    )}>
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const selectClass = [
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
  'text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50',
].join(' ');

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewAssignmentPage() {
  const params   = useParams();
  const router   = useRouter();
  const tenantId = params.tenantId as string;

  const [isPending, startTransition] = useTransition();
  const [drivers,  setDrivers]       = useState<{ $id: string; firstName: string; lastName: string }[]>([]);
  const [vehicles, setVehicles]      = useState<{ $id: string; registrationNumber: string }[]>([]);
  const [selectedDriver,  setSelectedDriver]  = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [driversResult, vehiclesResult] = await Promise.all([
          getOwnerDriversAction(tenantId, 1, 100),
          getOwnerVehiclesAction(tenantId),
        ]);
        if (driversResult.success  && driversResult.data)  setDrivers(driversResult.data.documents   || []);
        if (vehiclesResult.success && vehiclesResult.data) setVehicles(vehiclesResult.data.documents  || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !selectedVehicle) {
      toast.error('Please select both a driver and a vehicle');
      return;
    }
    startTransition(async () => {
      try {
        const result = await assignDriverToVehicleAction(tenantId, {
          driverId:  selectedDriver,
          vehicleId: selectedVehicle,
          isPrimary,
        });
        if (result.success) {
          toast.success('Driver assigned to vehicle successfully');
          router.push(`/owner/${tenantId}/assignments`);
        } else {
          toast.error(result.error || 'Failed to assign driver');
        }
      } catch {
        toast.error('Failed to assign driver');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/owner/${tenantId}/assignments`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New assignment</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Assign a driver to a vehicle</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            <SectionCard title="Assignment details" description="Select a driver and vehicle to pair" accent="blue">
              <div className="flex flex-col gap-4">

                {/* Driver */}
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Driver
                </div>
                <Field label="Select driver" htmlFor="driver">
                  <select
                    id="driver"
                    value={selectedDriver}
                    onChange={e => setSelectedDriver(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Choose a driver…</option>
                    {drivers.length === 0
                      ? <option disabled>No drivers found</option>
                      : drivers.map(d => (
                          <option key={d.$id} value={d.$id}>
                            {d.firstName} {d.lastName}
                          </option>
                        ))
                    }
                  </select>
                </Field>

                <div className="my-1 border-t border-border" />

                {/* Vehicle */}
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> Vehicle
                </div>
                <Field label="Select vehicle" htmlFor="vehicle">
                  <select
                    id="vehicle"
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Choose a vehicle…</option>
                    {vehicles.length === 0
                      ? <option disabled>No vehicles found</option>
                      : vehicles.map(v => (
                          <option key={v.$id} value={v.$id} className="font-mono">
                            {v.registrationNumber}
                          </option>
                        ))
                    }
                  </select>
                </Field>

              </div>
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Primary driver toggle */}
            <SectionCard title="Primary driver" description="Mark as the main driver for this vehicle" accent="amber">
              <label className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                isPrimary
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'border-border hover:bg-muted/50'
              )}>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={e => setIsPrimary(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  isPrimary
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-border bg-background'
                )}>
                  {isPrimary && (
                    <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Star className={cn('h-3.5 w-3.5 shrink-0', isPrimary ? 'text-amber-500' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-xs font-medium">Primary driver</p>
                    <p className="text-xs text-muted-foreground">Main driver for this vehicle</p>
                  </div>
                </div>
              </label>
            </SectionCard>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />Create assignment</>
                }
              </button>
              <Link
                href={`/owner/${tenantId}/assignments`}
                className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Link>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}