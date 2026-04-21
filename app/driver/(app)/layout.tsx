'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DriverNavbar } from '@/components/driver/driver-navbar';
import { Spinner } from '@/components/ui/spinner';

interface DriverSession {
  driverId: string;
  ownerId: string;
  tenantId: string;
  vehicleId?: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function DriverAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<DriverSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validateSession() {
      const token = localStorage.getItem('driver_token');
      const tenantId = searchParams.get('tenant') || localStorage.getItem('driver_tenant');
      
      if (!token) {
        router.push(`/driver/login${tenantId ? `?tenant=${tenantId}` : ''}`);
        return;
      }

      try {
        const response = await fetch('/api/driver/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Session invalid');
        }

        const data = await response.json();
        setSession(data.driver);
        
        // Store tenant for future use
        if (data.driver?.tenantId) {
          localStorage.setItem('driver_tenant', data.driver.tenantId);
        }
      } catch {
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_tenant');
        router.push(`/driver/login${tenantId ? `?tenant=${tenantId}` : ''}`);
      } finally {
        setIsLoading(false);
      }
    }

    validateSession();
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <DriverNavbar tenantId={session.tenantId} />
    </div>
  );
}
