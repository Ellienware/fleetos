'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Settings, Loader2, Save, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createRankAction, updateRankAction } from '../../actions';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const rankSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  latitude: z.number({ invalid_type_error: 'Select a location' }).min(-90).max(90),
  longitude: z.number({ invalid_type_error: 'Select a location' }).min(-180).max(180),
  geofenceRadius: z.number().min(50).max(5000).optional(),
  autoDispatch: z.boolean().default(true),
  responseTimeoutMinutes: z.number().min(1).max(10).default(2),
});

type RankFormValues = z.infer<typeof rankSchema>;

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
    blue: 'border-l-[3px] border-l-blue-500',
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
// Places input (fixed: clears coordinates when input is emptied)
// ---------------------------------------------------------------------------

function PlacesInput({
  error,
  onSelect,
  defaultValue,
}: {
  error?: string;
  onSelect: (lat: number | null, lng: number | null, address: string) => void;
  defaultValue?: string;
}) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: 'za' } },
    debounce: 300,
    cache: 86400,
    defaultValue,
  });

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(lat, lng, description);
    } catch {
      toast.error('Could not get coordinates for that location.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (newValue.trim() === '') {
      onSelect(null, null, '');
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={handleInputChange}
          disabled={!ready}
          placeholder="Search for a location in South Africa…"
          className={cn(inputClass, 'pl-8', error && inputErrorClass)}
        />
      </div>
      {status === 'OK' && data.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-md">
          {data.map(({ place_id, description, structured_formatting }) => (
            <li
              key={place_id}
              onMouseDown={() => handleSelect(description)}
              className="flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium leading-tight">{structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground">{structured_formatting.secondary_text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle (fixed double-click issue)
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center justify-between rounded-lg border px-3.5 py-3 transition-colors',
        checked
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
          : 'border-border hover:bg-muted/50'
      )}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-xs font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-green-600' : 'bg-border'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface RankFormProps {
  tenantId: string;
  initialData?: any;
  rankId?: string;
}

export function RankForm({ tenantId, initialData, rankId }: RankFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locationLabel, setLocationLabel] = useState<string>(initialData?.locationLabel ?? '');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RankFormValues>({
    resolver: zodResolver(rankSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      latitude: initialData.location?.lat,
      longitude: initialData.location?.lng,
      geofenceRadius: initialData.geofenceRadius ?? undefined,
      autoDispatch: initialData.autoDispatch ?? true,
      responseTimeoutMinutes: initialData.responseTimeoutMinutes ?? 2,
    } : {
      autoDispatch: true,
      responseTimeoutMinutes: 2,
    },
  });

  const autoDispatch = watch('autoDispatch');
  const responseTimeoutMinutes = watch('responseTimeoutMinutes');
  const latitude = watch('latitude');

  const onSubmit = (data: RankFormValues) => {
    startTransition(async () => {
      const payload = {
        name: data.name,
        location: { lat: data.latitude, lng: data.longitude },
        geofenceRadius: data.geofenceRadius,
        autoDispatch: data.autoDispatch,
        responseTimeoutMinutes: data.responseTimeoutMinutes,
      };
      const result = rankId
        ? await updateRankAction(tenantId, rankId, payload)
        : await createRankAction(tenantId, payload);

      if (result.success) {
        toast.success(rankId ? 'Rank updated' : 'Rank created');
        router.push(`/tenant/${tenantId}/ranks`);
      } else {
        toast.error(result.error ?? 'Something went wrong');
      }
    });
  };

  const handleLocationSelect = (lat: number | null, lng: number | null, address: string) => {
    if (lat !== null && lng !== null) {
      setValue('latitude', lat, { shouldValidate: true });
      setValue('longitude', lng, { shouldValidate: true });
      setLocationLabel(address);
    } else {
      setValue('latitude', undefined as any, { shouldValidate: true });
      setValue('longitude', undefined as any, { shouldValidate: true });
      setLocationLabel('');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/ranks`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {rankId ? 'Edit rank' : 'Add new rank'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rankId ? 'Update rank details and settings' : 'Register a new taxi rank'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <SectionCard title="Rank information" description="Name and physical location" accent="blue">
              <div className="flex flex-col gap-4">
                <Field label="Rank name" htmlFor="name" error={errors.name?.message}>
                  <input
                    id="name"
                    {...register('name')}
                    placeholder="e.g. Bara Taxi Rank"
                    className={cn(inputClass, errors.name && inputErrorClass)}
                  />
                </Field>

                <Field
                  label="Location"
                  hint="Search for an address or landmark in South Africa"
                  error={errors.latitude?.message ?? errors.longitude?.message}
                >
                  <PlacesInput
                    error={errors.latitude?.message}
                    defaultValue={locationLabel}
                    onSelect={handleLocationSelect}
                  />
                </Field>

                {latitude && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 dark:border-green-800 dark:bg-green-950/40">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-xs text-green-800 dark:text-green-200">
                      Coordinates locked — {watch('latitude')?.toFixed(5)}, {watch('longitude')?.toFixed(5)}
                    </p>
                  </div>
                )}

                <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
                <input type="hidden" {...register('longitude', { valueAsNumber: true })} />
              </div>
            </SectionCard>

            <SectionCard title="Dispatch settings" description="Control how vehicles are called from this rank" accent="amber">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Settings className="h-3.5 w-3.5" /> Behaviour
                </div>

                <Toggle
                  checked={autoDispatch}
                  onChange={val => setValue('autoDispatch', val)}
                  label="Auto-dispatch"
                  description="Automatically call the next vehicle when a slot opens"
                />

                <Field
                  label="Response timeout"
                  htmlFor="responseTimeoutMinutes"
                  hint="How long a called driver has to respond before being skipped"
                  error={errors.responseTimeoutMinutes?.message}
                >
                  <div className="flex items-center gap-3">
                    <input
                      id="responseTimeoutMinutes"
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      {...register('responseTimeoutMinutes', { valueAsNumber: true })}
                      className="flex-1 accent-foreground"
                    />
                    <span className="w-16 rounded-md border border-border bg-muted px-2.5 py-1.5 text-center text-sm font-medium tabular-nums">
                      {responseTimeoutMinutes} min
                    </span>
                  </div>
                </Field>

                <Field
                  label="Geofence radius (metres)"
                  htmlFor="geofenceRadius"
                  hint="Vehicles must be within this distance to enter the queue"
                  error={errors.geofenceRadius?.message}
                  optional
                >
                  <input
                    id="geofenceRadius"
                    type="number"
                    {...register('geofenceRadius', { valueAsNumber: true })}
                    placeholder="e.g. 200"
                    className={cn(inputClass, 'font-mono', errors.geofenceRadius && inputErrorClass)}
                  />
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />{rankId ? 'Updating…' : 'Creating…'}</>
                  : <><Save className="h-4 w-4" />{rankId ? 'Update rank' : 'Create rank'}</>
                }
              </button>
              <Link
                href={`/tenant/${tenantId}/ranks`}
                className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card border-l-[3px] border-l-blue-500">
              <div className="border-b px-5 py-4">
                <p className="text-sm font-medium">Settings summary</p>
              </div>
              <div className="divide-y px-5">
                <div className="flex items-center justify-between py-3 text-xs">
                  <span className="text-muted-foreground">Auto-dispatch</span>
                  <span className={cn('font-medium', autoDispatch ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
                    {autoDispatch ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-xs">
                  <span className="text-muted-foreground">Response timeout</span>
                  <span className="font-medium tabular-nums">{responseTimeoutMinutes} min</span>
                </div>
                <div className="flex items-center justify-between py-3 text-xs">
                  <span className="text-muted-foreground">Location</span>
                  <span className={cn('font-medium', latitude ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
                    {latitude ? 'Set' : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}