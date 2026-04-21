import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Vehicle, VehicleFormData, VehicleStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

interface CreateVehicleData extends VehicleFormData {
  status?: VehicleStatus;
}

export async function createVehicle(
  tenantId: string,
  data: CreateVehicleData
): Promise<Vehicle> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.VEHICLES,
    ID.unique(),
    {
      tenantId,
      ownerId: data.ownerId,
      registrationNumber: data.registrationNumber.toUpperCase(),
      make: data.make,
      model: data.model,
      year: data.year,
      capacity: data.capacity,
      status: data.status || ('active' as VehicleStatus),
      operatingPermitNumber: data.operatingPermitNumber,
      operatingPermitExpiry: data.operatingPermitExpiry,
      insuranceExpiry: data.insuranceExpiry,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Vehicle;
}

export async function getVehicleById(vehicleId: string): Promise<Vehicle | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.VEHICLES,
      vehicleId
    ) as unknown as Vehicle;
  } catch {
    return null;
  }
}

export async function getVehiclesByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  status?: VehicleStatus   // ← add this
): Promise<PaginatedResponse<Vehicle>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const queries = [Query.equal('tenantId', tenantId), Query.orderDesc('createdAt')];
  
  if (status) {
    queries.push(Query.equal('status', status));
  }
  
  queries.push(Query.limit(limit), Query.offset(offset));
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.VEHICLES,
    queries
  );
  
  return {
    documents: response.documents as unknown as Vehicle[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getVehiclesByOwner(ownerId: string): Promise<Vehicle[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.VEHICLES,
    [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('createdAt'),
    ]
  );
  
  return response.documents as unknown as Vehicle[];
}

export async function updateVehicle(
  vehicleId: string,
  data: Partial<VehicleFormData & { status: VehicleStatus }>
): Promise<Vehicle> {
  const { databases } = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  if (data.registrationNumber) {
    updateData.registrationNumber = data.registrationNumber.toUpperCase();
  }
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.VEHICLES,
    vehicleId,
    updateData
  ) as unknown as Vehicle;
}

export async function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus
): Promise<Vehicle> {
  return updateVehicle(vehicleId, { status });
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.VEHICLES,
    vehicleId
  );
}

export async function getVehicleByRegistration(tenantId: string, registrationNumber: string): Promise<Vehicle | null> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.VEHICLES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('registrationNumber', registrationNumber.toUpperCase()),
      Query.limit(1),
    ]
  );
  return response.documents[0] as unknown as Vehicle || null;
}

export async function getActiveVehiclesCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.VEHICLES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getExpiringVehicles(
  tenantId: string,
  daysAhead = 30
): Promise<Vehicle[]> {
  const { databases } = createAdminClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.VEHICLES,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.lessThanEqual('operatingPermitExpiry', futureDate.toISOString()),
        Query.lessThanEqual('insuranceExpiry', futureDate.toISOString()),
      ]),
      Query.orderAsc('operatingPermitExpiry'),
    ]
  );
  
  return response.documents as unknown as Vehicle[];
}
