'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle, XCircle, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface Shift {
  $id: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: string;
  vehicleId: string;
  vehicleRegistration?: string;
  routeId?: string;
  routeName?: string;
}

export default function DriverShiftsPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const { toast } = useToast();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  async function fetchShifts() {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    try {
      const response = await fetch('/api/driver/shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setShifts(data.shifts || []);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClockIn(shiftId: string) {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setActionLoading(shiftId);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const response = await fetch('/api/driver/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftId,
          action: 'clock_in',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clock in');
      }

      toast({
        title: 'Clocked In',
        description: 'You have successfully clocked in.',
      });

      fetchShifts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clock in. Please enable location.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClockOut(shiftId: string) {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setActionLoading(shiftId);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const response = await fetch('/api/driver/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftId,
          action: 'clock_out',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clock out');
      }

      toast({
        title: 'Clocked Out',
        description: 'You have successfully clocked out.',
      });

      fetchShifts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clock out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const now = new Date();
  const scheduledShifts = shifts.filter(s => s.status === 'scheduled');
  const activeShifts = shifts.filter(s => s.status === 'in_progress');
  const completedShifts = shifts.filter(s => s.status === 'completed');
  const cancelledShifts = shifts.filter(s => s.status === 'cancelled');

  function getStatusBadge(status: string) {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in_progress':
        return <Badge>In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function renderShiftCard(shift: Shift) {
    const startDate = new Date(shift.scheduledStart);
    const isToday = startDate.toDateString() === now.toDateString();
    const canClockIn = shift.status === 'scheduled' && isToday && 
                       Date.now() >= startDate.getTime() - 30 * 60 * 1000;

    return (
      <Card key={shift.$id}>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {startDate.toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {startDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(shift.scheduledEnd).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {shift.vehicleRegistration && (
                <p className="text-sm text-muted-foreground">
                  Vehicle: {shift.vehicleRegistration}
                </p>
              )}
              {shift.routeName && (
                <p className="text-sm text-muted-foreground">
                  Route: {shift.routeName}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(shift.status)}
              
              {canClockIn && !activeShifts.length && (
                <Button 
                  size="sm" 
                  onClick={() => handleClockIn(shift.$id)}
                  disabled={actionLoading === shift.$id}
                >
                  {actionLoading === shift.$id ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Clock In
                </Button>
              )}
              
              {shift.status === 'in_progress' && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleClockOut(shift.$id)}
                  disabled={actionLoading === shift.$id}
                >
                  {actionLoading === shift.$id ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  Clock Out
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">My Shifts</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your scheduled shifts
        </p>
      </div>

      {/* Active Shift Alert */}
      {activeShifts.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 animate-pulse" />
              Shift In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeShifts.map(shift => renderShiftCard(shift))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({scheduledShifts.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedShifts.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledShifts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {scheduledShifts.length > 0 ? (
            scheduledShifts.map(shift => renderShiftCard(shift))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No upcoming shifts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedShifts.length > 0 ? (
            completedShifts.map(shift => renderShiftCard(shift))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <CheckCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No completed shifts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelledShifts.length > 0 ? (
            cancelledShifts.map(shift => renderShiftCard(shift))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <XCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No cancelled shifts</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
