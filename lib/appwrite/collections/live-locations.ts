import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { LiveLocation, VehicleTrackingStatus } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

// Timeout threshold for marking vehicle as offline (5 minutes)
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
// Timeout threshold for marking vehicle as idle (2 minutes without movement)
const IDLE_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Determine vehicle status based on speed and last update time
 */
function determineStatus(speed: number, lastUpdate: Date): VehicleTrackingStatus {
  const now = new Date();
  const timeDiff = now.getTime() - lastUpdate.getTime();
  
  if (timeDiff > OFFLINE_THRESHOLD_MS) {
    return 'offline';
  }
  if (speed < 1) {
    // Consider vehicle idle if speed is less than 1 km/h
    return 'idle';
  }
  return 'active';
}

/**
 * Update live location for a vehicle (alias for upsertLiveLocation)
 */
export async function updateLiveLocation(
  vehicleId: string,
  tenantId: string,
  data: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy?: number | null;
    status: VehicleTrackingStatus;
    driverId?: string;
  }
): Promise<LiveLocation> {
  return upsertLiveLocation({
    vehicleId,
    tenantId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    heading: data.heading,
  });
}

/**
 * Update or create live location for a vehicle
 */
export async function upsertLiveLocation(data: {
  vehicleId: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}): Promise<LiveLocation> {
  const { databases } = createAdminClient();
  
  const now = new Date();
  const status = determineStatus(data.speed || 0, now);
  
  // Try to find existing live location
  const existing = await getLiveLocationByVehicle(data.vehicleId);
  
  const locationData = {
    vehicleId: data.vehicleId,
    tenantId: data.tenantId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed || 0,
    heading: data.heading || 0,
    status,
    timestamp: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  if (existing) {
    // Update existing record
    return databases.updateDocument(
      databaseId,
      COLLECTIONS.LIVE_LOCATIONS,
      existing.$id,
      locationData
    ) as unknown as LiveLocation;
  } else {
    // Create new record
    return databases.createDocument(
      databaseId,
      COLLECTIONS.LIVE_LOCATIONS,
      ID.unique(),
      locationData
    ) as unknown as LiveLocation;
  }
}

/**
 * Get live location for a specific vehicle
 */
export async function getLiveLocationByVehicle(vehicleId: string): Promise<LiveLocation | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.LIVE_LOCATIONS,
      [Query.equal('vehicleId', vehicleId), Query.limit(1)]
    );
    
    return response.documents[0] as unknown as LiveLocation || null;
  } catch {
    return null;
  }
}

/**
 * Get all live locations for a tenant
 */
export async function getLiveLocationsByTenant(tenantId: string): Promise<LiveLocation[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LIVE_LOCATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('updatedAt'),
    ]
  );
  
  return response.documents as unknown as LiveLocation[];
}

/**
 * Get live locations for vehicles owned by a specific owner
 */
export async function getLiveLocationsByOwner(
  tenantId: string,
  vehicleIds: string[]
): Promise<LiveLocation[]> {
  const { databases } = createAdminClient();
  
  if (vehicleIds.length === 0) return [];
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LIVE_LOCATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('vehicleId', vehicleIds),
      Query.orderDesc('updatedAt'),
    ]
  );
  
  return response.documents as unknown as LiveLocation[];
}

/**
 * Get live locations filtered by status
 */
export async function getLiveLocationsByStatus(
  tenantId: string,
  status: VehicleTrackingStatus
): Promise<LiveLocation[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LIVE_LOCATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', status),
      Query.orderDesc('updatedAt'),
    ]
  );
  
  return response.documents as unknown as LiveLocation[];
}

/**
 * Get tracking statistics for a tenant
 */
export async function getTrackingStats(tenantId: string): Promise<{
  total: number;
  active: number;
  idle: number;
  offline: number;
}> {
  const { databases } = createAdminClient();
  
  const [total, active, idle, offline] = await Promise.all([
    databases.listDocuments(databaseId, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('tenantId', tenantId),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'idle'),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'offline'),
      Query.limit(1),
    ]),
  ]);
  
  return {
    total: total.total,
    active: active.total,
    idle: idle.total,
    offline: offline.total,
  };
}

/**
 * Delete live location when vehicle is removed
 */
export async function deleteLiveLocation(vehicleId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  const location = await getLiveLocationByVehicle(vehicleId);
  if (location) {
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.LIVE_LOCATIONS,
      location.$id
    );
  }
}

/**
 * Batch update statuses for vehicles that haven't reported
 */
export async function updateStaleStatuses(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS).toISOString();
  
  const stale = await databases.listDocuments(
    databaseId,
    COLLECTIONS.LIVE_LOCATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.notEqual('status', 'offline'),
      Query.lessThan('updatedAt', threshold),
      Query.limit(100),
    ]
  );
  
  // Update each stale location to offline
  for (const doc of stale.documents) {
    await databases.updateDocument(
      databaseId,
      COLLECTIONS.LIVE_LOCATIONS,
      doc.$id,
      { status: 'offline' }
    );
  }
  
  return stale.documents.length;
}
