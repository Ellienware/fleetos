'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveLocation, Vehicle, VehicleTrackingStatus } from '@/types';

interface VehicleMapProps {
  locations: (LiveLocation & { vehicle?: Vehicle })[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onVehicleClick?: (vehicleId: string) => void;
  selectedVehicleId?: string | null;
  showStatusFilter?: boolean;
}

const STATUS_COLORS: Record<VehicleTrackingStatus, string> = {
  active: '#22c55e',
  idle: '#f59e0b',
  offline: '#ef4444',
};

const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 };
const DEFAULT_ZOOM = 11;

// Global flag to prevent multiple script injections
let googleMapsScriptAdded = false;

export function VehicleMap({
  locations,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onVehicleClick,
  selectedVehicleId,
  showStatusFilter = true,
}: VehicleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<VehicleTrackingStatus | 'all'>('all');
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map – only once globally
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError('Google Maps API key is not configured');
      return;
    }

    // If already loaded globally, just init map
    if (window.google?.maps) {
      initMap();
      return;
    }

    // If script already added but not yet loaded, wait for callback
    if (googleMapsScriptAdded) {
      (window as any).initMap = initMap;
      return;
    }

    // Add script for the first time
    googleMapsScriptAdded = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;
    (window as any).initMap = initMap;
    script.onerror = () => setMapError('Failed to load Google Maps. Please check your API key.');
    document.head.appendChild(script);

    function initMap() {
      if (mapRef.current && !googleMapRef.current) {
        googleMapRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setIsLoaded(true);
      }
      delete (window as any).initMap;
    }

    return () => {
      // Cleanup markers only, not the script
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
    };
  }, [center, zoom]);

  // Update markers when locations change
  const updateMarkers = useCallback(() => {
    if (!googleMapRef.current || !isLoaded) return;

    const filteredLocations = statusFilter === 'all'
      ? locations
      : locations.filter((loc) => loc.status === statusFilter);

    const currentVehicleIds = new Set(filteredLocations.map((loc) => loc.vehicleId));
    markersRef.current.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        marker.setMap(null);
        markersRef.current.delete(vehicleId);
      }
    });

    filteredLocations.forEach((location) => {
      const position = { lat: location.latitude, lng: location.longitude };
      let marker = markersRef.current.get(location.vehicleId);
      if (marker) {
        marker.setPosition(position);
        marker.setIcon(createMarkerIcon(location.status, location.heading, selectedVehicleId === location.vehicleId));
      } else {
        marker = new google.maps.Marker({
          position,
          map: googleMapRef.current!,
          icon: createMarkerIcon(location.status, location.heading, selectedVehicleId === location.vehicleId),
          title: location.vehicle?.registrationNumber || location.vehicleId,
        });
        marker.addListener('click', () => {
          if (infoWindowRef.current && googleMapRef.current) {
            const content = createInfoWindowContent(location);
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(googleMapRef.current, marker);
          }
          onVehicleClick?.(location.vehicleId);
        });
        markersRef.current.set(location.vehicleId, marker);
      }
    });

    if (filteredLocations.length > 0 && !selectedVehicleId) {
      const bounds = new google.maps.LatLngBounds();
      filteredLocations.forEach((loc) => bounds.extend({ lat: loc.latitude, lng: loc.longitude }));
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (Math.abs(ne.lat() - sw.lat()) > 0.01 || Math.abs(ne.lng() - sw.lng()) > 0.01) {
        googleMapRef.current?.fitBounds(bounds);
      }
    }
  }, [locations, statusFilter, selectedVehicleId, onVehicleClick, isLoaded]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    if (selectedVehicleId && googleMapRef.current) {
      const location = locations.find((loc) => loc.vehicleId === selectedVehicleId);
      if (location) {
        googleMapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
        googleMapRef.current.setZoom(15);
      }
    }
  }, [selectedVehicleId, locations]);

  if (mapError) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{mapError}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables
          </p>
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: locations.length,
    active: locations.filter((l) => l.status === 'active').length,
    idle: locations.filter((l) => l.status === 'idle').length,
    offline: locations.filter((l) => l.status === 'offline').length,
  };

  return (
    <div className="relative h-full w-full">
      {showStatusFilter && (
        <div className="absolute left-4 top-4 z-10 flex gap-2 rounded-lg bg-background/95 p-2 shadow-lg backdrop-blur">
          {(['all', 'active', 'idle', 'offline'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {status !== 'all' && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
              )}
              <span className="capitalize">{status}</span>
              <span className="ml-1 rounded-full bg-background/50 px-1.5 py-0.5 text-[10px]">
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>
      )}
      <div ref={mapRef} className="h-full w-full rounded-lg" />
      {!isLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function createMarkerIcon(
  status: VehicleTrackingStatus,
  heading: number,
  isSelected: boolean
): google.maps.Symbol {
  const color = STATUS_COLORS[status];
  const scale = isSelected ? 1.5 : 1;
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6 * scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: isSelected ? '#000' : '#fff',
    strokeWeight: isSelected ? 2 : 1,
    rotation: heading,
  };
}

function createInfoWindowContent(location: LiveLocation & { vehicle?: Vehicle }): string {
  const statusColor = STATUS_COLORS[location.status];
  const time = new Date(location.timestamp).toLocaleTimeString('en-ZA');
  return `
    <div style="padding: 8px; min-width: 180px;">
      <div style="font-weight: 600; margin-bottom: 8px;">
        ${location.vehicle?.registrationNumber || 'Unknown Vehicle'}
      </div>
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></span>
        <span style="text-transform: capitalize; font-size: 13px;">${location.status}</span>
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 8px;">
        <div>Speed: ${location.speed} km/h</div>
        <div>Last update: ${time}</div>
      </div>
    </div>
  `;
}