'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getRoutesAction, getVehiclesAction, getAllRouteAssignmentsAction, updateRouteAssignmentAction } from '../../../actions';

export default function EditRouteAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const assignmentId = params.assignmentId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [routes, setRoutes] = useState<{ $id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ $id: string; registrationNumber: string; ownerId: string }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [originalAssignment, setOriginalAssignment] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [routesResult, vehiclesResult, assignmentsResult] = await Promise.all([
          getRoutesAction(tenantId, 1, 100, 'active'),
          getVehiclesAction(tenantId, 1, 100, 'active'),
          getAllRouteAssignmentsAction(tenantId),
        ]);
        if (routesResult.success) setRoutes(routesResult.data?.documents ?? []);
        if (vehiclesResult.success) setVehicles(vehiclesResult.data?.documents ?? []);
        if (assignmentsResult.success) {
          const assignment = assignmentsResult.data?.find((a: any) => a.$id === assignmentId);
          if (assignment) {
            setOriginalAssignment(assignment);
            setSelectedRoute(assignment.routeId);
            setSelectedVehicle(assignment.vehicleId);
            setSelectedOwner(assignment.ownerId);
          } else {
            toast.error('Assignment not found');
            router.push(`/tenant/${tenantId}/assignments`);
          }
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [tenantId, assignmentId]);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.$id === vehicleId);
    setSelectedVehicle(vehicleId);
    setSelectedOwner(vehicle?.ownerId || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute || !selectedVehicle || !selectedOwner) {
      toast.error('Please select a route, vehicle, and owner');
      return;
    }
    startTransition(async () => {
      try {
        const result = await updateRouteAssignmentAction(tenantId, assignmentId, {
          routeId: selectedRoute,
          vehicleId: selectedVehicle,
          ownerId: selectedOwner,
        });
        if (result.success) {
          toast.success('Assignment updated successfully');
          router.push(`/tenant/${tenantId}/assignments`);
        } else {
          toast.error(result.error || 'Failed to update assignment');
        }
      } catch { toast.error('Failed to update assignment'); }
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${tenantId}/assignments`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Route Assignment</h1>
          <p className="text-sm text-muted-foreground">Change the vehicle or route for this assignment.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6">
        <div className="grid gap-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Route *</label>
            <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.$id} value={r.$id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vehicle *</label>
            <select value={selectedVehicle} onChange={(e) => handleVehicleChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.$id} value={v.$id}>{v.registrationNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Owner (auto‑filled)</label>
            <input type="text" value={selectedOwner} disabled className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? 'Updating...' : 'Update Assignment'}
            </button>
            <Link href={`/tenant/${tenantId}/assignments`}>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}