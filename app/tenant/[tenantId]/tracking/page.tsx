'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import {
  MapPin,
  Bus,
  Clock,
  Activity,
  RefreshCw,
  Search,
  History,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleMap } from '@/components/tracking/vehicle-map';
import type { LiveLocation, Vehicle, VehicleTrackingStatus } from '@/types';

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function getTimeSince(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ---------------------------------------------------------------------------
// Status pill — mirrors vehicles StatusPill exactly
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<VehicleTrackingStatus, { dot: string; pill: string; label: string }> = {
  active:  { dot: 'bg-green-600', pill: 'bg-green-50  text-green-900  dark:bg-green-950 dark:text-green-100',  label: 'Active'  },
  idle:    { dot: 'bg-amber-500', pill: 'bg-amber-50  text-amber-900  dark:bg-amber-950 dark:text-amber-100',  label: 'Idle'    },
  offline: { dot: 'bg-red-600',   pill: 'bg-red-50    text-red-900    dark:bg-red-950   dark:text-red-100',    label: 'Offline' },
};

function StatusPill({ status }: { status: VehicleTrackingStatus }) {
  const s = STATUS_BADGE[status] ?? {
    dot: 'bg-muted-foreground',
    pill: 'bg-muted text-muted-foreground',
    label: status,
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat card — identical to vehicles StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string;
  value: number | null;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {value === null
        ? <Skeleton className="h-7 w-10" />
        : <div className={cn('text-2xl font-semibold leading-none tabular-nums', valueClass)}>{value}</div>
      }
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar skeleton — mirrors vehicles TableSkeleton cadence
// ---------------------------------------------------------------------------

function SidebarSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonoPill — shared with vehicles
// ---------------------------------------------------------------------------

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

export default function TrackingPage() {
  const params   = useParams();
  const tenantId = params.tenantId as string;

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]             = useState('');
  const [isDetailsOpen, setIsDetailsOpen]         = useState(false);
  const [detailsTab, setDetailsTab]               = useState<'status' | 'history'>('status');

  const { data: locationsData, error, isValidating, mutate } = useSWR(
    `/api/tracking/locations?tenantId=${tenantId}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const isLoading = !locationsData && !error;
  const locations: (LiveLocation & { vehicle: Vehicle })[] = locationsData?.locations || [];

  const filteredLocations = locations.filter(loc =>
    loc.vehicle?.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLocation = selectedVehicleId
    ? locations.find(loc => loc.vehicleId === selectedVehicleId) ?? null
    : null;

  const stats = {
    total:   locations.length,
    active:  locations.filter(l => l.status === 'active').length,
    idle:    locations.filter(l => l.status === 'idle').length,
    offline: locations.filter(l => l.status === 'offline').length,
  };

  const handleRefresh = useCallback(() => mutate(), [mutate]);

  const handleVehicleClick = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDetailsTab('status');
    setIsDetailsOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live Tracking</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Real-time vehicle monitoring and tracking
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isValidating}
          className="inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tracked vehicles"
          value={isLoading ? null : stats.total}
          icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active"
          value={isLoading ? null : stats.active}
          valueClass="text-green-700 dark:text-green-400"
          icon={<Activity className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
        />
        <StatCard
          label="Idle"
          value={isLoading ? null : stats.idle}
          valueClass="text-amber-700 dark:text-amber-400"
          icon={<Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
        />
        <StatCard
          label="Offline"
          value={isLoading ? null : stats.offline}
          valueClass="text-red-700 dark:text-red-400"
          icon={<MapPin className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />}
        />
      </div>

      {/* Main card — sidebar + map */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Card header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Fleet map</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Live positions update every 10 seconds
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {stats.total} vehicle{stats.total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex" style={{ height: 600 }}>

          {/* Sidebar */}
          <div className="flex w-72 shrink-0 flex-col border-r">

            {/* Toolbar */}
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by registration…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Vehicle list */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <SidebarSkeleton />
              ) : error ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <p>Failed to load vehicles</p>
                  <button onClick={handleRefresh} className="mt-1 text-xs underline underline-offset-2">
                    Try again
                  </button>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {locations.length === 0 ? (
                    <>
                      <Bus className="mx-auto h-7 w-7 text-muted-foreground/40" />
                      <p className="mt-2">No tracked vehicles</p>
                      <p className="mt-0.5 text-xs">Vehicles appear here when GPS data arrives</p>
                    </>
                  ) : (
                    'No vehicles match your search.'
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLocations.map(location => (
                    <button
                      key={location.vehicleId}
                      onClick={() => handleVehicleClick(location.vehicleId)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30',
                        selectedVehicleId === location.vehicleId && 'bg-muted/50'
                      )}
                    >
                      {/* Icon */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                        <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">
                          <MonoPill>{location.vehicle?.registrationNumber || '—'}</MonoPill>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {location.vehicle?.make} {location.vehicle?.model}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {location.speed} km/h
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeSince(location.timestamp)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusPill status={location.status} />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Map */}
          <div className="flex-1">
            <VehicleMap
              locations={filteredLocations}
              onVehicleClick={handleVehicleClick}
              selectedVehicleId={selectedVehicleId}
              showStatusFilter={false}
            />
          </div>
        </div>
      </div>

      {/* Details sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-[400px] sm:w-[480px]">
          {selectedLocation ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Bus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  {selectedLocation.vehicle?.registrationNumber || 'Unknown'}
                </SheetTitle>
                <SheetDescription>
                  {selectedLocation.vehicle?.make} {selectedLocation.vehicle?.model}{' '}
                  ({selectedLocation.vehicle?.year})
                </SheetDescription>
              </SheetHeader>

              {/* Tab strip — matches vehicles card header pattern */}
              <div className="mt-5 flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
                {(['status', 'history'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailsTab(tab)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      detailsTab === tab
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab === 'status' ? 'Current status' : 'Trip history'}
                  </button>
                ))}
              </div>

              {detailsTab === 'status' ? (
                <div className="mt-4 flex flex-col gap-3">

                  {/* Live status block */}
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live status</p>
                    </div>
                    <div className="divide-y px-4">
                      {[
                        { label: 'Status',      value: <StatusPill status={selectedLocation.status} /> },
                        { label: 'Speed',        value: `${selectedLocation.speed} km/h` },
                        { label: 'Heading',      value: `${selectedLocation.heading}°` },
                        { label: 'Last update',  value: getTimeSince(selectedLocation.timestamp) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location block */}
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</p>
                    </div>
                    <div className="divide-y px-4">
                      {[
                        { label: 'Latitude',  value: <span className="font-mono text-xs">{selectedLocation.latitude.toFixed(6)}</span> },
                        { label: 'Longitude', value: <span className="font-mono text-xs">{selectedLocation.longitude.toFixed(6)}</span> },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          {value}
                        </div>
                      ))}
                    </div>
                    <div className="border-t px-4 py-3">
                      <a
                        href={`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Open in Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Vehicle block */}
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle details</p>
                    </div>
                    <div className="divide-y px-4">
                      {[
                        {
                          label: 'Capacity',
                          value: selectedLocation.vehicle?.capacity
                            ? `${selectedLocation.vehicle.capacity} seats`
                            : '—',
                        },
                        {
                          label: 'Permit expires',
                          value: selectedLocation.vehicle?.operatingPermitExpiry
                            ? new Date(selectedLocation.vehicle.operatingPermitExpiry).toLocaleDateString('en-ZA')
                            : '—',
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border bg-card">
                  <div className="border-b px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trip history</p>
                  </div>
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <History className="mx-auto h-7 w-7 text-muted-foreground/40" />
                    <p className="mt-2">Trip history will appear here</p>
                    <p className="mt-0.5 text-xs">As vehicle locations are recorded</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a vehicle to view details
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}