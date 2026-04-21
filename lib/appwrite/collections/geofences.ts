import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Geofence, GeofenceFormData, GeofenceType, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createGeofence(
  tenantId: string,
  data: GeofenceFormData
): Promise<Geofence> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.GEOFENCES,
    ID.unique(),
    {
      tenantId,
      name: data.name,
      type: data.type,
      coordinates: JSON.stringify(data.coordinates),
      radius: data.radius || null,
      isActive: data.isActive,
      alertOnEntry: true,
      alertOnExit: true,
      alertOnDwell: false,
      dwellTimeMinutes: null,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Geofence;
}

export async function getGeofenceById(
  geofenceId: string
): Promise<Geofence | null> {
  const { databases } = createAdminClient();
  
  try {
    const doc = await databases.getDocument(
      databaseId,
      COLLECTIONS.GEOFENCES,
      geofenceId
    );
    
    return {
      ...doc,
      coordinates: JSON.parse(doc.coordinates as string),
    } as unknown as Geofence;
  } catch {
    return null;
  }
}

export async function getGeofencesByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    type?: GeofenceType;
    isActive?: boolean;
  }
): Promise<PaginatedResponse<Geofence>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (filters?.type) {
    queries.push(Query.equal('type', filters.type));
  }
  if (filters?.isActive !== undefined) {
    queries.push(Query.equal('isActive', filters.isActive));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCES,
    queries
  );
  
  const documents = response.documents.map(doc => ({
    ...doc,
    coordinates: JSON.parse(doc.coordinates as string),
  })) as unknown as Geofence[];
  
  return {
    documents,
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getActiveGeofencesByTenant(
  tenantId: string
): Promise<Geofence[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('isActive', true),
      Query.limit(100),
    ]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    coordinates: JSON.parse(doc.coordinates as string),
  })) as unknown as Geofence[];
}

export async function updateGeofence(
  geofenceId: string,
  data: Partial<GeofenceFormData & {
    alertOnEntry?: boolean;
    alertOnExit?: boolean;
    alertOnDwell?: boolean;
    dwellTimeMinutes?: number;
  }>
): Promise<Geofence> {
  const { databases } = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.coordinates !== undefined) updateData.coordinates = JSON.stringify(data.coordinates);
  if (data.radius !== undefined) updateData.radius = data.radius;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.alertOnEntry !== undefined) updateData.alertOnEntry = data.alertOnEntry;
  if (data.alertOnExit !== undefined) updateData.alertOnExit = data.alertOnExit;
  if (data.alertOnDwell !== undefined) updateData.alertOnDwell = data.alertOnDwell;
  if (data.dwellTimeMinutes !== undefined) updateData.dwellTimeMinutes = data.dwellTimeMinutes;
  
  const doc = await databases.updateDocument(
    databaseId,
    COLLECTIONS.GEOFENCES,
    geofenceId,
    updateData
  );
  
  return {
    ...doc,
    coordinates: JSON.parse(doc.coordinates as string),
  } as unknown as Geofence;
}

export async function toggleGeofenceActive(
  geofenceId: string,
  isActive: boolean
): Promise<Geofence> {
  return updateGeofence(geofenceId, { isActive });
}

export async function deleteGeofence(geofenceId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.GEOFENCES,
    geofenceId
  );
}

export async function getGeofencesByType(
  tenantId: string,
  type: GeofenceType
): Promise<Geofence[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.GEOFENCES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('type', type),
      Query.equal('isActive', true),
      Query.limit(100),
    ]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    coordinates: JSON.parse(doc.coordinates as string),
  })) as unknown as Geofence[];
}
