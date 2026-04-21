'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  IdCard,
  Calendar,
  Bus,
  LogOut,
  Shield,
  Clock,
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DriverProfile {
  $id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email?: string;
  prdpNumber: string;
  prdpExpiry: string;
  driverLicenseNumber: string;
  driverLicenseExpiry: string;
  driverLicenseCode: string;
  status: string;
  tenantName?: string;
  vehicleRegistration?: string;
  ownerName?: string;
}

export default function DriverProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem('driver_token');
      if (!token) return;

      try {
        const response = await fetch('/api/driver/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data.driver);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  function handleLogout() {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_tenant');
    router.push(`/driver/login${tenantId ? `?tenant=${tenantId}` : ''}`);
  }

  function getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">Unable to load profile</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const prdpDays = getDaysUntil(profile.prdpExpiry);
  const licenseDays = getDaysUntil(profile.driverLicenseExpiry);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your driver information
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{profile.firstName} {profile.lastName}</CardTitle>
              <CardDescription>{profile.tenantName || 'Association'}</CardDescription>
              <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {profile.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">ID Number</p>
                <p className="font-mono">{profile.idNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p>{profile.phone}</p>
              </div>
            </div>
            {profile.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p>{profile.email}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Assignment */}
      {profile.vehicleRegistration && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bus className="h-4 w-4" />
              Assigned Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{profile.vehicleRegistration}</p>
            {profile.ownerName && (
              <p className="text-sm text-muted-foreground">Owner: {profile.ownerName}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* License Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            License Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">License Code</p>
              <Badge variant="outline" className="mt-1">
                Code {profile.driverLicenseCode}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">License Number</p>
              <p className="font-mono">{profile.driverLicenseNumber}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">License Expiry</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p>{new Date(profile.driverLicenseExpiry).toLocaleDateString('en-ZA')}</p>
                {licenseDays <= 30 && licenseDays > 0 && (
                  <Badge variant="outline" className="text-warning">
                    {licenseDays} days
                  </Badge>
                )}
                {licenseDays <= 0 && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">PrDP Expiry</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p>{new Date(profile.prdpExpiry).toLocaleDateString('en-ZA')}</p>
                {prdpDays <= 30 && prdpDays > 0 && (
                  <Badge variant="outline" className="text-warning">
                    {prdpDays} days
                  </Badge>
                )}
                {prdpDays <= 0 && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">PrDP Number</p>
            <p className="font-mono">{profile.prdpNumber}</p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again with your ID number and OTP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
