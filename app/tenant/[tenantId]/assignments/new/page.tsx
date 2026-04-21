'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createRouteAssignmentAction, getRoutesAction, getVehiclesAction } from '../../actions';

export default function NewRouteAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isPending, startTransition] = useTransition();
  const [routes, setRoutes] = useState<{ $id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [routesResult, vehiclesResult] = await Promise.all([
          getRoutesAction(tenantId, 1, 100, 'active'),
          getVehiclesAction(tenantId, 1, 100, 'active'),
        ]);
        if (routesResult.success) setRoutes(routesResult.data?.documents ?? []);
        if (vehiclesResult.success) {
          const vehiclesData = vehiclesResult.data?.documents ?? [];
          setVehicles(vehiclesData);
          setFilteredVehicles(vehiclesData);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [tenantId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = vehicles.filter(v => 
      v.registrationNumber.toLowerCase().includes(query)
    );
    setFilteredVehicles(filtered);
  }, [searchQuery, vehicles]);

  const handleVehicleSelect = (vehicleId: string) => {
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
        const result = await createRouteAssignmentAction(tenantId, {
          routeId: selectedRoute,
          vehicleId: selectedVehicle,
          ownerId: selectedOwner,
        });
        if (result.success) {
          toast.success('Vehicle assigned to route successfully');
          router.push(`/tenant/${tenantId}/assignments`);
        } else {
          toast.error(result.error || 'Failed to assign vehicle');
        }
      } catch { toast.error('Failed to assign vehicle'); }
    });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${tenantId}/assignments`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Route Assignment</h1>
          <p className="text-sm text-muted-foreground">Assign a vehicle to a route.</p>
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Search Vehicle</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by registration number..."
                className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vehicle *</label>
            <select value={selectedVehicle} onChange={(e) => handleVehicleSelect(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required>
              <option value="">Select vehicle</option>
              {filteredVehicles.length === 0 && searchQuery && <option disabled>No vehicles match</option>}
              {filteredVehicles.map(v => (
                <option key={v.$id} value={v.$id}>{v.registrationNumber}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Owner (auto‑filled)</label>
            <input type="text" value={selectedOwner} disabled className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? 'Assigning...' : 'Assign Vehicle'}
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