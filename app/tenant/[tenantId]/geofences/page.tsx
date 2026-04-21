'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Navigation,
  Circle,
  Square,
  Hexagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Geofence, GeofenceType } from '@/types';

// Type colors
const TYPE_COLORS: Record<GeofenceType, string> = {
  route: 'bg-primary/10 text-primary',
  rank: 'bg-success/10 text-success',
  zone: 'bg-warning/10 text-warning-foreground',
  restricted: 'bg-destructive/10 text-destructive',
};

const TYPE_ICONS: Record<GeofenceType, any> = {
  route: Navigation,
  rank: MapPin,
  zone: Hexagon,
  restricted: Shield,
};

export default function GeofencesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<GeofenceType | 'all'>('all');
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'zone' as GeofenceType,
    radius: 500,
    isActive: true,
    alertOnEntry: true,
    alertOnExit: true,
    alertOnDwell: false,
    dwellTimeMinutes: 10,
  });

  // Fetch geofences
  useEffect(() => {
    async function fetchGeofences() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/geofences?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setGeofences(data.documents || []);
        }
      } catch (error) {
        console.error('Error fetching geofences:', error);
        toast.error('Failed to load geofences');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGeofences();
  }, [tenantId]);

  const filteredGeofences = geofences.filter((gf) => {
    if (typeFilter !== 'all' && gf.type !== typeFilter) return false;
    if (searchQuery) {
      return gf.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleCreateSubmit = () => {
    startTransition(async () => {
      try {
        // In real implementation, would call API to create geofence
        // For now, add to local state with mock data
        const newGeofence: Geofence = {
          $id: `gf-${Date.now()}`,
          tenantId,
          name: formData.name,
          type: formData.type,
          coordinates: [{ lat: -26.2041, lng: 28.0473 }], // Default Johannesburg
          radius: formData.radius,
          isActive: formData.isActive,
          alertOnEntry: formData.alertOnEntry,
          alertOnExit: formData.alertOnExit,
          alertOnDwell: formData.alertOnDwell,
          dwellTimeMinutes: formData.dwellTimeMinutes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setGeofences(prev => [newGeofence, ...prev]);
        setIsCreateOpen(false);
        setFormData({
          name: '',
          type: 'zone',
          radius: 500,
          isActive: true,
          alertOnEntry: true,
          alertOnExit: true,
          alertOnDwell: false,
          dwellTimeMinutes: 10,
        });
        toast.success('Geofence created successfully');
      } catch (error) {
        toast.error('Failed to create geofence');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    
    startTransition(async () => {
      try {
        setGeofences(prev => prev.filter(gf => gf.$id !== deleteId));
        toast.success('Geofence deleted');
      } catch (error) {
        toast.error('Failed to delete geofence');
      } finally {
        setDeleteId(null);
      }
    });
  };

  const handleToggleActive = (geofenceId: string, isActive: boolean) => {
    setGeofences(prev => prev.map(gf => 
      gf.$id === geofenceId ? { ...gf, isActive } : gf
    ));
    toast.success(isActive ? 'Geofence activated' : 'Geofence deactivated');
  };

  const stats = {
    total: geofences.length,
    active: geofences.filter(gf => gf.isActive).length,
    routes: geofences.filter(gf => gf.type === 'route').length,
    restricted: geofences.filter(gf => gf.type === 'restricted').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geofences</h1>
          <p className="text-muted-foreground">
            Define geographic zones and set up alerts for vehicle tracking
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Geofence
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Geofence</DialogTitle>
              <DialogDescription>
                Define a geographic zone for vehicle monitoring
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., CBD Zone, Main Rank"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as GeofenceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="route">Route Corridor</SelectItem>
                    <SelectItem value="rank">Taxi Rank</SelectItem>
                    <SelectItem value="zone">Operating Zone</SelectItem>
                    <SelectItem value="restricted">Restricted Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="50"
                  max="10000"
                  value={formData.radius}
                  onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 500 }))}
                />
              </div>
              
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Alert Settings</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alertOnEntry" className="text-sm font-normal">Alert on Entry</Label>
                  <Switch
                    id="alertOnEntry"
                    checked={formData.alertOnEntry}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alertOnEntry: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alertOnExit" className="text-sm font-normal">Alert on Exit</Label>
                  <Switch
                    id="alertOnExit"
                    checked={formData.alertOnExit}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alertOnExit: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alertOnDwell" className="text-sm font-normal">Alert on Dwell</Label>
                  <Switch
                    id="alertOnDwell"
                    checked={formData.alertOnDwell}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alertOnDwell: checked }))}
                  />
                </div>
                
                {formData.alertOnDwell && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="dwellTime" className="text-sm font-normal">Dwell time (minutes)</Label>
                    <Input
                      id="dwellTime"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.dwellTimeMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, dwellTimeMinutes: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="text-sm font-normal">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSubmit} disabled={isPending || !formData.name}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Geofence'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Geofences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Hexagon className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.total}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold text-success">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.active}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Route Corridors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.routes}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Restricted Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.restricted}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geofences Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Geofences</CardTitle>
          <CardDescription>
            Manage your geographic zones and monitoring areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search geofences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as GeofenceType | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="route">Route Corridor</SelectItem>
                  <SelectItem value="rank">Taxi Rank</SelectItem>
                  <SelectItem value="zone">Operating Zone</SelectItem>
                  <SelectItem value="restricted">Restricted Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                </div>
              ))}
            </div>
          ) : filteredGeofences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Hexagon className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No geofences found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {geofences.length === 0
                  ? 'Create your first geofence to start monitoring vehicles.'
                  : 'No geofences match your search criteria.'}
              </p>
              {geofences.length === 0 && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Geofence
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGeofences.map((geofence) => {
                    const TypeIcon = TYPE_ICONS[geofence.type];
                    return (
                      <TableRow key={geofence.$id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <TypeIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{geofence.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {geofence.coordinates.length} point(s)
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize ${TYPE_COLORS[geofence.type]} border-0`}
                          >
                            {geofence.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {geofence.radius ? `${geofence.radius}m` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {geofence.alertOnEntry && (
                              <Badge variant="secondary" className="text-xs">Entry</Badge>
                            )}
                            {geofence.alertOnExit && (
                              <Badge variant="secondary" className="text-xs">Exit</Badge>
                            )}
                            {geofence.alertOnDwell && (
                              <Badge variant="secondary" className="text-xs">Dwell</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={geofence.isActive}
                            onCheckedChange={(checked) => handleToggleActive(geofence.$id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteId(geofence.$id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Geofence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this geofence? All associated alerts and history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
