'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation, DollarSign, Bus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface Route {
  $id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  distance: number;
  baseFare: number;
  status: string;
}

export default function DriverRoutesPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRoutes() {
      const token = localStorage.getItem('driver_token');
      if (!token) return;

      try {
        const response = await fetch('/api/driver/routes', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setRoutes(data.routes || []);
          setFilteredRoutes(data.routes || []);
        }
      } catch (error) {
        console.error('Failed to fetch routes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoutes();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = routes.filter(
      (route) =>
        route.name.toLowerCase().includes(query) ||
        route.code.toLowerCase().includes(query) ||
        route.origin.toLowerCase().includes(query) ||
        route.destination.toLowerCase().includes(query)
    );
    setFilteredRoutes(filtered);
  }, [searchQuery, routes]);

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Routes</h1>
        <p className="text-sm text-muted-foreground">
          Active routes in your association
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Routes List */}
      {filteredRoutes.length > 0 ? (
        <div className="space-y-4">
          {filteredRoutes.map((route) => (
            <Card key={route.$id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {route.code}
                    </Badge>
                    <CardTitle className="text-base">{route.name}</CardTitle>
                  </div>
                  <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                    {route.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm">{route.origin}</span>
                    </div>
                    <div className="ml-1 h-4 border-l-2 border-dashed border-muted-foreground/30" />
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-sm">{route.destination}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Navigation className="h-4 w-4" />
                    <span>{route.distance} km</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span>R{route.baseFare}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {searchQuery ? 'No routes found' : 'No routes available'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Your association has not set up any routes yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
