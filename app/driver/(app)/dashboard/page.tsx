'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bus,
  MapPin,
  Calendar,
  Clock,
  Play,
  Square,
  Navigation,
  Bell,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface DriverProfile {
  driverId: string;
  firstName: string;
  lastName: string;
  phone: string;
  tenantId: string;
  tenantName: string;
  vehicleId?: string;
  vehicleRegistration?: string;
}

interface Shift {
  $id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  vehicleId: string;
  routeId?: string;
}

export default function DriverDashboardPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('driver_token');
      if (!token) return;

      try {
        const [profileRes, shiftsRes] = await Promise.all([
          fetch('/api/driver/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/driver/shifts', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.driver);
        }

        if (shiftsRes.ok) {
          const shiftsData = await shiftsRes.json();
          setShifts(shiftsData.shifts || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Location sharing toggle
  useEffect(() => {
    let watchId: number | null = null;

    if (isLocationEnabled && profile) {
      const token = localStorage.getItem('driver_token');
      
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              await fetch('/api/driver/location', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  speed: position.coords.speed || 0,
                  heading: position.coords.heading || 0,
                  accuracy: position.coords.accuracy,
                }),
              });
            } catch (error) {
              console.error('Failed to send location:', error);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast({
              title: 'Location Error',
              description: 'Unable to access your location. Please enable location permissions.',
              variant: 'destructive',
            });
            setIsLocationEnabled(false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
          }
        );
      }
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isLocationEnabled, profile, toast]);

  async function handleClockIn(shiftId: string) {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setIsClockingIn(true);

    try {
      // Get current location
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
        description: 'You have successfully clocked in for your shift.',
      });

      // Enable location sharing automatically
      setIsLocationEnabled(true);

      // Refresh shifts
      const shiftsRes = await fetch('/api/driver/shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData.shifts || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clock in. Please ensure location is enabled.',
        variant: 'destructive',
      });
    } finally {
      setIsClockingIn(false);
    }
  }

  async function handleClockOut(shiftId: string) {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setIsClockingIn(true);

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

      // Disable location sharing
      setIsLocationEnabled(false);

      // Refresh shifts
      const shiftsRes = await fetch('/api/driver/shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        setShifts(shiftsData.shifts || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clock out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClockingIn(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const activeShift = shifts.find(s => s.status === 'in_progress');
  const upcomingShifts = shifts.filter(s => s.status === 'scheduled');

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {profile?.firstName || 'Driver'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile?.tenantName || 'Association'}
          </p>
        </div>
        <Link href={`/driver/profile?tenant=${tenantId}`}>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Vehicle Assignment */}
      {profile?.vehicleRegistration && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned Vehicle</p>
              <p className="text-lg font-semibold">{profile.vehicleRegistration}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Sharing Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Navigation className={`h-5 w-5 ${isLocationEnabled ? 'text-success animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium">Live Location</p>
              <p className="text-sm text-muted-foreground">
                {isLocationEnabled ? 'Sharing your location' : 'Location sharing off'}
              </p>
            </div>
          </div>
          <Switch
            checked={isLocationEnabled}
            onCheckedChange={setIsLocationEnabled}
          />
        </CardContent>
      </Card>

      {/* Active Shift */}
      {activeShift && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Shift</CardTitle>
              <Badge>In Progress</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(activeShift.scheduledStart).toLocaleTimeString('en-ZA', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - {new Date(activeShift.scheduledEnd).toLocaleTimeString('en-ZA', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            <Button 
              onClick={() => handleClockOut(activeShift.$id)}
              disabled={isClockingIn}
              variant="destructive"
              className="w-full"
            >
              {isClockingIn ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Clock Out
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shifts */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Upcoming Shifts</h2>
        {upcomingShifts.length > 0 ? (
          <div className="space-y-3">
            {upcomingShifts.slice(0, 3).map((shift) => {
              const startDate = new Date(shift.scheduledStart);
              const isToday = startDate.toDateString() === new Date().toDateString();
              const canClockIn = isToday && Date.now() >= startDate.getTime() - 30 * 60 * 1000; // 30 mins before
              
              return (
                <Card key={shift.$id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {startDate.toLocaleDateString('en-ZA', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {startDate.toLocaleTimeString('en-ZA', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {new Date(shift.scheduledEnd).toLocaleTimeString('en-ZA', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    {canClockIn && !activeShift && (
                      <Button 
                        size="sm" 
                        onClick={() => handleClockIn(shift.$id)}
                        disabled={isClockingIn}
                      >
                        {isClockingIn ? (
                          <Spinner className="mr-2 h-4 w-4" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Clock In
                      </Button>
                    )}
                    {!canClockIn && (
                      <Badge variant="outline">Scheduled</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No upcoming shifts</p>
            </CardContent>
          </Card>
        )}
        
        {upcomingShifts.length > 3 && (
          <Link href={`/driver/shifts?tenant=${tenantId}`}>
            <Button variant="ghost" className="mt-2 w-full">
              View All Shifts
            </Button>
          </Link>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href={`/driver/routes?tenant=${tenantId}`}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center py-6">
              <MapPin className="mb-2 h-6 w-6 text-primary" />
              <p className="font-medium">Routes</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/driver/announcements?tenant=${tenantId}`}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center py-6">
              <Bell className="mb-2 h-6 w-6 text-primary" />
              <p className="font-medium">Announcements</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
