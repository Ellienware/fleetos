import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { LocationHistory, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

/**
 * Create a new location history entry (alias for recordLocation)
 */
export async function createLocationHistory(
  vehicleId: string,
  tenantId: string,
  data: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy?: number | null;
    driverId?: string;
  }
): Promise<LocationHistory> {
  return recordLocation({
    vehicleId,
    tenantId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    heading: data.heading,
  });
}

/**
 * Record a new location in history
 */
export async function recordLocation(data: {
  vehicleId: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}): Promise<LocationHistory> {
  const { databases } = createAdminClient();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.LOCATION_HISTORY,
    ID.unique(),
    {
      vehicleId: data.vehicleId,
      tenantId: data.tenantId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed || 0,
      heading: data.heading || 0,
      timestamp: new Date().toISOString(),
    }
  ) as unknown as LocationHistory;
}

/**
 * Get location history for a vehicle within a time range
 */
export async function getVehicleHistory(
  vehicleId: string,
  startTime: string,
  endTime: string,
  limit = 1000
): Promise<LocationHistory[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LOCATION_HISTORY,
    [
      Query.equal('vehicleId', vehicleId),
      Query.greaterThanEqual('timestamp', startTime),
      Query.lessThanEqual('timestamp', endTime),
      Query.orderAsc('timestamp'),
      Query.limit(limit),
    ]
  );
  
  return response.documents as unknown as LocationHistory[];
}

/**
 * Get paginated location history for a vehicle
 */
export async function getVehicleHistoryPaginated(
  vehicleId: string,
  page = 1,
  limit = 100
): Promise<PaginatedResponse<LocationHistory>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LOCATION_HISTORY,
    [
      Query.equal('vehicleId', vehicleId),
      Query.orderDesc('timestamp'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as LocationHistory[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

/**
 * Get the last N locations for a vehicle (for trip playback)
 */
export async function getRecentLocations(
  vehicleId: string,
  count = 100
): Promise<LocationHistory[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LOCATION_HISTORY,
    [
      Query.equal('vehicleId', vehicleId),
      Query.orderDesc('timestamp'),
      Query.limit(count),
    ]
  );
  
  // Return in chronological order
  return (response.documents as unknown as LocationHistory[]).reverse();
}

/**
 * Get trip history for today
 */
export async function getTodayHistory(vehicleId: string): Promise<LocationHistory[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return getVehicleHistory(
    vehicleId,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );
}

/**
 * Get trip summary for a time range
 */
export async function getTripSummary(
  vehicleId: string,
  startTime: string,
  endTime: string
): Promise<{
  totalPoints: number;
  startLocation: LocationHistory | null;
  endLocation: LocationHistory | null;
  avgSpeed: number;
  maxSpeed: number;
  estimatedDistance: number;
}> {
  const history = await getVehicleHistory(vehicleId, startTime, endTime);
  
  if (history.length === 0) {
    return {
      totalPoints: 0,
      startLocation: null,
      endLocation: null,
      avgSpeed: 0,
      maxSpeed: 0,
      estimatedDistance: 0,
    };
  }
  
  const speeds = history.map(h => h.speed);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  
  // Calculate estimated distance using Haversine formula
  let totalDistance = 0;
  for (let i = 1; i < history.length; i++) {
    totalDistance += haversineDistance(
      history[i - 1].latitude,
      history[i - 1].longitude,
      history[i].latitude,
      history[i].longitude
    );
  }
  
  return {
    totalPoints: history.length,
    startLocation: history[0],
    endLocation: history[history.length - 1],
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    maxSpeed: Math.round(maxSpeed * 10) / 10,
    estimatedDistance: Math.round(totalDistance * 100) / 100, // km
  };
}

/**
 * Delete old location history (cleanup job)
 * Keeps only the last N days of history
 */
export async function cleanupOldHistory(
  tenantId: string,
  daysToKeep = 30
): Promise<number> {
  const { databases } = createAdminClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const old = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LOCATION_HISTORY,
    [
      Query.equal('tenantId', tenantId),
      Query.lessThan('timestamp', cutoffDate.toISOString()),
      Query.limit(100),
    ]
  );
  
  // Delete old records
  for (const doc of old.documents) {
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.LOCATION_HISTORY,
      doc.$id
    );
  }
  
  return old.documents.length;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
