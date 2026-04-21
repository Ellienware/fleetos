'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, MapPin, Route as RouteIcon, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getRouteAction, updateRouteAction } from '../../../actions';
import type { RouteStatus, RouteStop } from '@/types';
import { StopManager } from '@/components/StopManager';
import { Skeleton } from '@/components/ui/skeleton';

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
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
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
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputClass = [
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
  'disabled:opacity-50',
].join(' ');

const inputErrorClass = 'border-red-500 focus:ring-red-500';

// ---------------------------------------------------------------------------
// Status options — same radio-card pattern as all other forms
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: RouteStatus; label: string; description: string }[] = [
  { value: 'active',   label: 'Active',   description: 'Open for vehicle assignment' },
  { value: 'inactive', label: 'Inactive', description: 'Not currently in service' },
];

const STATUS_ACCENT: Record<RouteStatus, string> = {
  active:   'border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  inactive: 'border-red-500   bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100',
};

const STATUS_DOT: Record<RouteStatus, string> = {
  active:   'bg-green-600',
  inactive: 'bg-red-500',
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditRoutePage() {
  const params   = useParams();
  const router   = useRouter();
  const tenantId = params.tenantId as string;
  const routeId  = params.routeId  as string;

  const [isLoading, setIsLoading]    = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors]          = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name:           '',
    code:           '',
    origin:         '',
    destination:    '',
    originLat:      0,
    originLng:      0,
    destinationLat: 0,
    destinationLng: 0,
    distance:       '',
    baseFare:       '',
    maxVehicles:    '',
    status:         'active' as RouteStatus,
    stops:          [] as RouteStop[],
  });

  useEffect(() => {
    async function fetchRoute() {
      try {
        const result = await getRouteAction(routeId);
        if (result.success && result.data) {
          const r = result.data;
          setFormData({
            name:           r.name           ?? '',
            code:           r.code           ?? '',
            origin:         r.origin         ?? '',
            destination:    r.destination    ?? '',
            originLat:      r.originLat      ?? 0,
            originLng:      r.originLng      ?? 0,
            destinationLat: r.destinationLat ?? 0,
            destinationLng: r.destinationLng ?? 0,
            distance:       r.distance?.toString()    ?? '',
            baseFare:       r.baseFare?.toString()    ?? '',
            maxVehicles:    r.maxVehicles?.toString() ?? '',
            status:         r.status ?? 'active',
            // getRouteById already parses stops — no double-parsing needed
            stops:          Array.isArray(r.stops) ? r.stops : [],
          });
        } else {
          toast.error('Route not found');
          router.push(`/tenant/${tenantId}/routes`);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load route');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoute();
  }, [routeId, tenantId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())        e.name        = 'Route name is required';
    if (!formData.code.trim())        e.code        = 'Route code is required';
    if (!formData.origin.trim())      e.origin      = 'Origin is required';
    if (!formData.destination.trim()) e.destination = 'Destination is required';
    if (!formData.distance || parseFloat(formData.distance) <= 0) e.distance = 'Valid distance is required';
    if (!formData.baseFare || parseFloat(formData.baseFare) <= 0) e.baseFare = 'Valid fare is required';
    if (!formData.maxVehicles || parseInt(formData.maxVehicles) <= 0) e.maxVehicles = 'Valid max vehicles is required';

    // Validate stop fare progression
    const baseFareNum = parseFloat(formData.baseFare);
    let prevFare = 0;
    for (let i = 0; i < formData.stops.length; i++) {
      const stop = formData.stops[i];
      if (stop.fareFromOrigin <= prevFare) {
        e.stops = `Stop ${i + 1} fare must be greater than the previous stop's fare (R${prevFare.toFixed(2)})`;
        break;
      }
      if (stop.fareFromOrigin >= baseFareNum) {
        e.stops = `Stop ${i + 1} fare must be less than the destination fare (R${baseFareNum.toFixed(2)})`;
        break;
      }
      prevFare = stop.fareFromOrigin;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await updateRouteAction(tenantId, routeId, {
          name:           formData.name,
          code:           formData.code.toUpperCase(),
          origin:         formData.origin,
          destination:    formData.destination,
          originLat:      formData.originLat,
          originLng:      formData.originLng,
          destinationLat: formData.destinationLat,
          destinationLng: formData.destinationLng,
          distance:       parseFloat(formData.distance),
          baseFare:       parseFloat(formData.baseFare),
          maxVehicles:    parseInt(formData.maxVehicles),
          status:         formData.status,
          stops:          formData.stops,
        });
        if (result.success) {
          toast.success('Route updated successfully');
          router.push(`/tenant/${tenantId}/routes/${routeId}`);
        } else {
          toast.error(result.error ?? 'Failed to update route');
        }
      } catch {
        toast.error('Failed to update route');
      }
    });
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/routes/${routeId}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit route</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Update route details and stops</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            {/* Route information */}
            <SectionCard title="Route information" description="Identity and endpoints" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <RouteIcon className="h-3.5 w-3.5" /> Identity
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Route code" htmlFor="code" error={errors.code}>
                    <input
                      id="code" name="code"
                      value={formData.code} onChange={handleChange}
                      className={cn(inputClass, 'font-mono tracking-wider uppercase', errors.code && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Route name" htmlFor="name" error={errors.name}>
                    <input
                      id="name" name="name"
                      value={formData.name} onChange={handleChange}
                      className={cn(inputClass, errors.name && inputErrorClass)}
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Endpoints
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Origin" htmlFor="origin" error={errors.origin}>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-green-600 shrink-0" />
                      <input
                        id="origin" name="origin"
                        value={formData.origin} onChange={handleChange}
                        className={cn(inputClass, 'pl-7', errors.origin && inputErrorClass)}
                      />
                    </div>
                  </Field>
                  <Field label="Destination" htmlFor="destination" error={errors.destination}>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-red-600 shrink-0" />
                      <input
                        id="destination" name="destination"
                        value={formData.destination} onChange={handleChange}
                        className={cn(inputClass, 'pl-7', errors.destination && inputErrorClass)}
                      />
                    </div>
                  </Field>
                </div>

                {/* Coordinate status indicators */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: 'Origin coordinates', lat: formData.originLat, lng: formData.originLng },
                    { label: 'Destination coordinates', lat: formData.destinationLat, lng: formData.destinationLng },
                  ].map(({ label, lat, lng }) => (
                    <div key={label} className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                      lat !== 0
                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200'
                        : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                    )}>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {lat !== 0 ? `${label}: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : `${label}: not set`}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* Route details */}
            <SectionCard title="Route details" description="Distance, fare, and capacity" accent="blue">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Distance (km)" htmlFor="distance" error={errors.distance}>
                  <input
                    id="distance" name="distance" type="number" step="0.1"
                    value={formData.distance} onChange={handleChange}
                    placeholder="e.g. 18.5"
                    className={cn(inputClass, errors.distance && inputErrorClass)}
                  />
                </Field>
                <Field label="Base fare (R)" htmlFor="baseFare" error={errors.baseFare}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground">R</span>
                    <input
                      id="baseFare" name="baseFare" type="number" step="0.50"
                      value={formData.baseFare} onChange={handleChange}
                      placeholder="18"
                      className={cn(inputClass, 'pl-6 font-mono', errors.baseFare && inputErrorClass)}
                    />
                  </div>
                </Field>
                <Field label="Max vehicles" htmlFor="maxVehicles" error={errors.maxVehicles}>
                  <input
                    id="maxVehicles" name="maxVehicles" type="number"
                    value={formData.maxVehicles} onChange={handleChange}
                    placeholder="e.g. 15"
                    className={cn(inputClass, 'font-mono', errors.maxVehicles && inputErrorClass)}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* Stops */}
            <SectionCard title="Intermediate stops" description="Pick-up and drop-off points along the route" accent="amber">
              <StopManager
                stops={formData.stops}
                onChange={newStops => setFormData(prev => ({ ...prev, stops: newStops }))}
                destinationFare={parseFloat(formData.baseFare) || 0}
                originAddress={formData.origin}
                destinationAddress={formData.destination}
              />
              {errors.stops && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{errors.stops}</p>
              )}
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Status — radio-card pattern consistent with all other forms */}
            <SectionCard title="Status" description="Change route status" accent="green">
              <div className="flex flex-col gap-3">
                {STATUS_OPTIONS.map(opt => (
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
                      type="radio"
                      name="status"
                      value={opt.value}
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
                ))}
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
                href={`/tenant/${tenantId}/routes/${routeId}`}
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