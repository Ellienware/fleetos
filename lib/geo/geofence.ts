import { getActiveGeofencesByTenant } from '@/lib/appwrite/collections/geofences';
import { createGeofenceAlert } from '@/lib/appwrite/collections/geofence-alerts';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';
import type { Geofence, GeofenceAlertType } from '@/types';

interface Point {
  lat: number;
  lng: number;
}

// In-memory cache for vehicle geofence states (in production, use Redis)
const vehicleGeofenceStates: Map<string, Set<string>> = new Map();

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(
  point: Point,
  center: Point,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is inside a geofence
 */
export function isPointInGeofence(point: Point, geofence: Geofence): boolean {
  if (geofence.radius && geofence.coordinates.length === 1) {
    // Circle geofence
    return isPointInCircle(point, geofence.coordinates[0], geofence.radius);
  } else {
    // Polygon geofence
    return isPointInPolygon(point, geofence.coordinates);
  }
}

/**
 * Get the current geofence states for a vehicle
 */
function getVehicleStates(vehicleId: string): Set<string> {
  if (!vehicleGeofenceStates.has(vehicleId)) {
    vehicleGeofenceStates.set(vehicleId, new Set());
  }
  return vehicleGeofenceStates.get(vehicleId)!;
}

/**
 * Check all geofences for a vehicle location and create alerts
 */
export async function checkGeofences(
  tenantId: string,
  vehicleId: string,
  driverId: string | undefined,
  location: Point
): Promise<void> {
  try {
    // Get all active geofences for tenant
    const geofences = await getActiveGeofencesByTenant(tenantId);
    
    if (geofences.length === 0) return;
    
    // Get vehicle to find owner
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) return;
    
    const currentStates = getVehicleStates(vehicleId);
    const newStates = new Set<string>();
    
    for (const geofence of geofences) {
      const isInside = isPointInGeofence(location, geofence);
      const wasInside = currentStates.has(geofence.$id);
      
      if (isInside) {
        newStates.add(geofence.$id);
      }
      
      // Check for entry
      if (isInside && !wasInside && geofence.alertOnEntry) {
        await createGeofenceAlertEntry(
          tenantId,
          geofence,
          vehicleId,
          driverId,
          vehicle.ownerId,
          location,
          'entry'
        );
      }
      
      // Check for exit
      if (!isInside && wasInside && geofence.alertOnExit) {
        await createGeofenceAlertEntry(
          tenantId,
          geofence,
          vehicleId,
          driverId,
          vehicle.ownerId,
          location,
          'exit'
        );
      }
    }
    
    // Update states
    vehicleGeofenceStates.set(vehicleId, newStates);
  } catch (error) {
    console.error('Error checking geofences:', error);
  }
}

async function createGeofenceAlertEntry(
  tenantId: string,
  geofence: Geofence,
  vehicleId: string,
  driverId: string | undefined,
  ownerId: string,
  location: Point,
  alertType: GeofenceAlertType
): Promise<void> {
  const actionText = alertType === 'entry' ? 'entered' : 'exited';
  const message = `Vehicle ${actionText} geofence: ${geofence.name}`;
  
  await createGeofenceAlert(tenantId, {
    geofenceId: geofence.$id,
    vehicleId,
    driverId,
    ownerId,
    alertType,
    latitude: location.lat,
    longitude: location.lng,
    message,
  });
}

/**
 * Check if a location is within any restricted geofence
 */
export async function isInRestrictedArea(
  tenantId: string,
  location: Point
): Promise<{ restricted: boolean; geofenceName?: string }> {
  const geofences = await getActiveGeofencesByTenant(tenantId);
  
  for (const geofence of geofences) {
    if (geofence.type === 'restricted' && isPointInGeofence(location, geofence)) {
      return { restricted: true, geofenceName: geofence.name };
    }
  }
  
  return { restricted: false };
}

/**
 * Get all geofences that contain a point
 */
export async function getGeofencesContainingPoint(
  tenantId: string,
  location: Point
): Promise<Geofence[]> {
  const geofences = await getActiveGeofencesByTenant(tenantId);
  
  return geofences.filter(geofence => isPointInGeofence(location, geofence));
}

/**
 * Clear cached geofence states for a vehicle
 */
export function clearVehicleGeofenceStates(vehicleId: string): void {
  vehicleGeofenceStates.delete(vehicleId);
}

/**
 * Clear all cached geofence states
 */
export function clearAllGeofenceStates(): void {
  vehicleGeofenceStates.clear();
}
