import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Driver, DriverFormData, DriverStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createDriver(
  tenantId: string,
  ownerId: string,
  data: Omit<DriverFormData, 'ownerId' | 'profilePhotoFile'>
): Promise<Driver> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.DRIVERS,
    ID.unique(),
    {
      tenantId,
      ownerId,
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      prdpNumber: data.prdpNumber,
      prdpExpiry: data.prdpExpiry,
      driverLicenseNumber: data.driverLicenseNumber,
      driverLicenseExpiry: data.driverLicenseExpiry,
      driverLicenseCode: data.driverLicenseCode,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      status: 'active' as DriverStatus,
      joinedAt: now,
    }
  ) as unknown as Driver;
}



export async function getDriverById(driverId: string): Promise<Driver | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.DRIVERS,
      driverId
    ) as unknown as Driver;
  } catch {
    return null;
  }
}

export async function getDriversByTenant(
  tenantId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<Driver>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as Driver[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getDriversByOwner(
  ownerId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<Driver>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('$createdAt'), // ← fixed
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  return {
    documents: response.documents as unknown as Driver[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getDriverByIdNumber(
  tenantId: string,
  idNumber: string
): Promise<Driver | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('idNumber', idNumber),
      Query.limit(1),
    ]
  );
  
  return response.documents[0] as unknown as Driver || null;
}

export async function getDriverByPhone(
  tenantId: string,
  phone: string
): Promise<Driver | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('phone', phone),
      Query.limit(1),
    ]
  );
  
  return response.documents[0] as unknown as Driver || null;
}

export async function updateDriver(
  driverId: string,
  data: Partial<Omit<DriverFormData, 'ownerId' | 'profilePhotoFile'> & { 
    status: DriverStatus;
    profilePhotoId?: string;
  }>
): Promise<Driver> {
  const { databases } = createAdminClient();
  
  // Remove any 'updatedAt' key if it exists (not needed)
  const { updatedAt, ...cleanData } = data as any;
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.DRIVERS,
    driverId,
    cleanData
  ) as unknown as Driver;
}

export async function deleteDriver(driverId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.DRIVERS,
    driverId
  );
}

export async function getActiveDriversCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getActiveDriversCountByOwner(ownerId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('ownerId', ownerId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getExpiringDriverDocuments(
  tenantId: string,
  daysAhead = 30
): Promise<Driver[]> {
  const { databases } = createAdminClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'active'),
      Query.or([
        Query.lessThanEqual('prdpExpiry', futureDate.toISOString()),
        Query.lessThanEqual('driverLicenseExpiry', futureDate.toISOString()),
      ]),
      Query.orderAsc('prdpExpiry'),
    ]
  );
  
  return response.documents as unknown as Driver[];
}

export async function searchDrivers(
  tenantId: string,
  searchTerm: string,
  limit = 10
): Promise<Driver[]> {
  const { databases } = createAdminClient();
  
  // Search by ID number, phone, or name
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVERS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.contains('idNumber', searchTerm),
        Query.contains('phone', searchTerm),
        Query.contains('firstName', searchTerm),
        Query.contains('lastName', searchTerm),
      ]),
      Query.limit(limit),
    ]
  );
  
  return response.documents as unknown as Driver[];
}
