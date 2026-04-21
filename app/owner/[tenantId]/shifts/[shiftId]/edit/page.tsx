'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, User, Car, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getOwnerShiftsAction, updateOwnerShiftAction, getOwnerDriversAction, getOwnerVehiclesAction } from '../../../actions';

// ---------------------------------------------------------------------------
// Shared primitives (identical to new-shift-page)
// ---------------------------------------------------------------------------

function SectionCard({ title, description, children, accent }: {
  title: string; description?: string; children: React.ReactNode; accent?: 'blue' | 'green' | 'amber';
}) {
  const stripe = { blue: 'border-l-[3px] border-l-blue-500', green: 'border-l-[3px] border-l-green-600', amber: 'border-l-[3px] border-l-amber-500' };
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', accent ? stripe[accent] : 'border-l-[3px] border-l-transparent')}>
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, htmlFor, optional, children }: { label: string; htmlFor?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditShiftPage() {
  const params   = useParams();
  const router   = useRouter();
  const tenantId = params.tenantId as string;
  const shiftId  = params.shiftId  as string;

  const [isLoading, setIsLoading]    = useState(true);
  const [isPending, startTransition] = useTransition();
  const [drivers,  setDrivers]       = useState<{ $id: string; firstName: string; lastName: string }[]>([]);
  const [vehicles, setVehicles]      = useState<{ $id: string; registrationNumber: string }[]>([]);
  const [selectedDriver,  setSelectedDriver]  = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime,   setEndTime]   = useState('');
  const [notes, setNotes]         = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [sr, dr, vr] = await Promise.all([
          getOwnerShiftsAction(tenantId, 1, 100),
          getOwnerDriversAction(tenantId, 1, 100),
          getOwnerVehiclesAction(tenantId),
        ]);
        const shift = sr.success && sr.data
          ? sr.data.documents?.find((s: any) => s.$id === shiftId)
          : null;
        if (shift) {
          setSelectedDriver(shift.driverId);
          setSelectedVehicle(shift.vehicleId);
          const start = new Date(shift.startTime);
          setStartDate(start.toISOString().slice(0, 10));
          setStartTime(start.toISOString().slice(11, 16));
          const end = new Date(shift.endTime);
          setEndTime(end.toISOString().slice(11, 16));
          setNotes(shift.notes || '');
        } else if (sr.success) {
          toast.error('Shift not found');
          router.push(`/owner/${tenantId}/shifts`);
        }
        if (dr.success && dr.data) setDrivers(dr.data.documents || []);
        if (vr.success && vr.data) setVehicles(vr.data.documents || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [tenantId, shiftId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !selectedVehicle || !startDate || !startTime || !endTime) {
      toast.error('Please fill all required fields');
      return;
    }
    const scheduledStart = new Date(`${startDate}T${startTime}`);
    const scheduledEnd   = new Date(`${startDate}T${endTime}`);
    if (scheduledEnd <= scheduledStart) { toast.error('End time must be after start time'); return; }

    startTransition(async () => {
      try {
        const result = await updateOwnerShiftAction(tenantId, shiftId, {
          driverId: selectedDriver, vehicleId: selectedVehicle,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd:   scheduledEnd.toISOString(),
          notes: notes || undefined,
        });
        if (result.success) {
          toast.success('Shift updated');
          router.push(`/owner/${tenantId}/shifts/${shiftId}`);
        } else {
          toast.error(result.error || 'Failed to update shift');
        }
      } catch { toast.error('Failed to update shift'); }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="h-56 rounded-xl bg-muted animate-pulse" />
            <div className="h-44 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/owner/${tenantId}/shifts/${shiftId}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit shift</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Update shift details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            {/* Assignment */}
            <SectionCard title="Assignment" description="Change the driver or vehicle for this shift" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Driver
                </div>
                <Field label="Select driver" htmlFor="driver">
                  <select id="driver" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} required className={inputClass}>
                    <option value="">Choose a driver…</option>
                    {drivers.map(d => <option key={d.$id} value={d.$id}>{d.firstName} {d.lastName}</option>)}
                  </select>
                </Field>

                <div className="my-1 border-t border-border" />

                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> Vehicle
                </div>
                <Field label="Select vehicle" htmlFor="vehicle">
                  <select id="vehicle" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} required className={inputClass}>
                    <option value="">Choose a vehicle…</option>
                    {vehicles.map(v => <option key={v.$id} value={v.$id} className="font-mono">{v.registrationNumber}</option>)}
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* Timing */}
            <SectionCard title="Timing" description="Update the date and time for this shift" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Schedule
                </div>
                <Field label="Date" htmlFor="startDate">
                  <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start time" htmlFor="startTime">
                    <input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className={inputClass} />
                  </Field>
                  <Field label="End time" htmlFor="endTime">
                    <input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className={inputClass} />
                  </Field>
                </div>
              </div>
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            <SectionCard title="Notes" description="Optional shift instructions" accent="amber">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Instructions
                </div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special instructions…"
                  className={cn(inputClass, 'resize-none')}
                />
              </div>
            </SectionCard>

            <div className="flex flex-col gap-2">
              <button
                type="submit" disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save changes</>}
              </button>
              <Link
                href={`/owner/${tenantId}/shifts/${shiftId}`}
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