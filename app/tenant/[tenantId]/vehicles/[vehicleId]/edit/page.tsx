'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Car, FileCheck, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import type { VehicleStatus } from '@/types';
import { getOwnerVehiclesAction, updateOwnerVehicleAction } from '@/app/owner/[tenantId]/actions';

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
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass = [
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
  'disabled:opacity-50',
].join(' ');

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: VehicleStatus; label: string; description: string }[] = [
  { value: 'active',      label: 'Active',      description: 'Ready for assignment' },
  { value: 'maintenance', label: 'Maintenance', description: 'Under servicing' },
  { value: 'inactive',    label: 'Inactive',    description: 'Not in service' },
];

const STATUS_ACCENT: Record<string, string> = {
  active:      'border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  maintenance: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  inactive:    'border-red-500   bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',
};

const STATUS_DOT: Record<string, string> = {
  active:      'bg-green-600',
  maintenance: 'bg-amber-500',
  inactive:    'bg-red-500',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditVehiclePage() {
  const params    = useParams();
  const router    = useRouter();
  const tenantId  = params.tenantId as string;
  const vehicleId = params.vehicleId as string;

  const [isLoading, setIsLoading]    = useState(true);
  const [isPending, startTransition] = useTransition();
  const [fetchError, setFetchError]  = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber:    '',
    make:                  '',
    model:                 '',
    year:                  new Date().getFullYear(),
    capacity:              15,
    operatingPermitNumber: '',
    operatingPermitExpiry: '',
    insuranceExpiry:       '',
    status:                'active' as VehicleStatus,
  });

  useEffect(() => {
    async function fetchVehicle() {
      try {
        const result = await getOwnerVehiclesAction(tenantId);
        if (result.success && result.data) {
          const vehicles = result.data.documents || result.data;
          const vehicle = Array.isArray(vehicles)
            ? vehicles.find((v: any) => v.$id === vehicleId)
            : null;
          if (vehicle) {
            setFormData({
              registrationNumber:    vehicle.registrationNumber    || '',
              make:                  vehicle.make                  || '',
              model:                 vehicle.model                 || '',
              year:                  vehicle.year                  || new Date().getFullYear(),
              capacity:              vehicle.capacity              || 15,
              operatingPermitNumber: vehicle.operatingPermitNumber || '',
              operatingPermitExpiry: vehicle.operatingPermitExpiry || '',
              insuranceExpiry:       vehicle.insuranceExpiry       || '',
              status:                vehicle.status                || 'active',
            });
          } else {
            setFetchError('Vehicle not found');
          }
        } else {
          setFetchError(result.error || 'Failed to load vehicle');
        }
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setFetchError('Failed to load vehicle');
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicle();
  }, [tenantId, vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateOwnerVehicleAction(tenantId, vehicleId, formData);
        if (result.success) {
          toast.success('Vehicle updated successfully');
          router.push(`/owner/${tenantId}/vehicles`);
        } else {
          toast.error(result.error || 'Failed to update vehicle');
        }
      } catch (err) {
        console.error('Error updating vehicle:', err);
        toast.error('Failed to update vehicle');
      }
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-base font-medium">Vehicle not found</p>
          <p className="mt-1 text-sm text-muted-foreground">{fetchError}</p>
        </div>
        <Link
          href={`/owner/${tenantId}/vehicles`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to vehicles
        </Link>
      </div>
    );
  }

  const isPending_ = formData.status === 'pending' as VehicleStatus;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/owner/${tenantId}/vehicles`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit vehicle</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Update your vehicle information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            {/* Vehicle details */}
            <SectionCard title="Vehicle details" description="Basic information about your taxi" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> Identity
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Registration number" htmlFor="registrationNumber">
                    <input
                      id="registrationNumber" name="registrationNumber"
                      value={formData.registrationNumber} onChange={handleChange}
                      placeholder="GP 123 456" required
                      className={cn(inputClass, 'font-mono tracking-wider uppercase')}
                    />
                  </Field>
                  <Field label="Seating capacity" htmlFor="capacity">
                    <input
                      id="capacity" name="capacity" type="number"
                      value={formData.capacity} onChange={handleNumberChange}
                      min="4" max="70"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Make" htmlFor="make">
                    <input
                      id="make" name="make"
                      value={formData.make} onChange={handleChange}
                      placeholder="Toyota"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Model" htmlFor="model">
                    <input
                      id="model" name="model"
                      value={formData.model} onChange={handleChange}
                      placeholder="Quantum"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Year" htmlFor="year">
                    <input
                      id="year" name="year" type="number"
                      value={formData.year} onChange={handleNumberChange}
                      min="2000" max={new Date().getFullYear() + 1}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Documentation */}
            <SectionCard title="Documentation" description="Operating permit and insurance details" accent="amber">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileCheck className="h-3.5 w-3.5" /> Expiry dates
                </div>

                <Field label="Operating permit number" htmlFor="operatingPermitNumber" optional>
                  <input
                    id="operatingPermitNumber" name="operatingPermitNumber"
                    value={formData.operatingPermitNumber} onChange={handleChange}
                    placeholder="OL/GP/12345"
                    className={cn(inputClass, 'font-mono text-xs tracking-wider')}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Permit expiry date" htmlFor="operatingPermitExpiry" optional>
                    <input
                      id="operatingPermitExpiry" name="operatingPermitExpiry"
                      type="date" value={formData.operatingPermitExpiry} onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Insurance expiry date" htmlFor="insuranceExpiry" optional>
                    <input
                      id="insuranceExpiry" name="insuranceExpiry"
                      type="date" value={formData.insuranceExpiry} onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Status */}
            <SectionCard
              title="Status"
              description={isPending_ ? 'Pending vehicles cannot have their status changed' : 'Change vehicle status'}
              accent="green"
            >
              <div className="flex flex-col gap-3">
                {isPending_ ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 dark:border-blue-800 dark:bg-blue-950">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      This vehicle is pending approval. Status cannot be changed until approved.
                    </p>
                  </div>
                ) : (
                  STATUS_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                        formData.status === opt.value
                          ? cn('border', STATUS_ACCENT[opt.value])
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <input
                        type="radio" name="status" value={opt.value}
                        checked={formData.status === opt.value}
                        onChange={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                        className="sr-only"
                      />
                      <div className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[opt.value])} />
                      <div>
                        <p className="text-xs font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit" disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />Save changes</>
                }
              </button>
              <Link
                href={`/owner/${tenantId}/vehicles`}
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