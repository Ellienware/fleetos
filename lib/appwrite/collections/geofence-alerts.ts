import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { GeofenceAlert, GeofenceAlertType, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createGeofenceAlert(
  tenantId: string,
  data: {
    geofenceId: string;
    vehicleId: string;
    driverId?: string;
    ownerId: string;
    alertType: GeofenceAlertType;
    latitude: number;
    longitude: number;
    message: string;
  }
): Promise<GeofenceAlert> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    ID.unique(),
    {
      tenantId,
      geofenceId: data.geofenceId,
      vehicleId: data.vehicleId,
      driverId: data.driverId || null,
      ownerId: data.ownerId,
      alertType: data.alertType,
      latitude: data.latitude,
      longitude: data.longitude,
      message: data.message,
      acknowledged: false,
      createdAt: now,
    }
  ) as unknown as GeofenceAlert;
}

export async function getAlertById(
  alertId: string
): Promise<GeofenceAlert | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.GEOFENCE_ALERTS,
      alertId
    ) as unknown as GeofenceAlert;
  } catch {
    return null;
  }
}

export async function getAlertsByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    acknowledged?: boolean;
    vehicleId?: string;
    geofenceId?: string;
    alertType?: GeofenceAlertType;
  }
): Promise<PaginatedResponse<GeofenceAlert>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (filters?.acknowledged !== undefined) {
    queries.push(Query.equal('acknowledged', filters.acknowledged));
  }
  if (filters?.vehicleId) {
    queries.push(Query.equal('vehicleId', filters.vehicleId));
  }
  if (filters?.geofenceId) {
    queries.push(Query.equal('geofenceId', filters.geofenceId));
  }
  if (filters?.alertType) {
    queries.push(Query.equal('alertType', filters.alertType));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    queries
  );
  
  return {
    documents: response.documents as unknown as GeofenceAlert[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getUnacknowledgedAlerts(
  tenantId: string,
  limit = 50
): Promise<GeofenceAlert[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('acknowledged', false),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
    ]
  );
  
  return response.documents as unknown as GeofenceAlert[];
}

export async function getAlertsByVehicle(
  vehicleId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<GeofenceAlert>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    [
      Query.equal('vehicleId', vehicleId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as GeofenceAlert[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getAlertsByOwner(
  ownerId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<GeofenceAlert>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as GeofenceAlert[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<GeofenceAlert> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    alertId,
    {
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy,
    }
  ) as unknown as GeofenceAlert;
}

export async function acknowledgeMultipleAlerts(
  alertIds: string[],
  acknowledgedBy: string
): Promise<void> {
  const { databases } = createAdminClient();
  
  for (const alertId of alertIds) {
    await databases.updateDocument(
      databaseId,
      COLLECTIONS.GEOFENCE_ALERTS,
      alertId,
      {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy,
      }
    );
  }
}

export async function getRecentAlertsCount(
  tenantId: string,
  hoursBack = 24
): Promise<number> {
  const { databases } = createAdminClient();
  
  const since = new Date();
  since.setHours(since.getHours() - hoursBack);
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    [
      Query.equal('tenantId', tenantId),
      Query.greaterThanEqual('createdAt', since.toISOString()),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function deleteOldAlerts(
  daysOld = 90
): Promise<number> {
  const { databases } = createAdminClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCE_ALERTS,
    [
      Query.lessThan('createdAt', cutoffDate.toISOString()),
      Query.equal('acknowledged', true),
      Query.limit(100),
    ]
  );
  
  let deletedCount = 0;
  for (const doc of response.documents) {
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.GEOFENCE_ALERTS,
      doc.$id
    );
    deletedCount++;
  }
  
  return deletedCount;
}
