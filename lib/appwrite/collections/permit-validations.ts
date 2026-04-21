import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { PermitValidation, PermitValidationStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

type ValidationType = 'operating_permit' | 'vehicle_registration' | 'prdp' | 'driver_license';

export async function createPermitValidation(
  tenantId: string,
  data: {
    vehicleId?: string;
    driverId?: string;
    validationType: ValidationType;
    referenceNumber: string;
    status: PermitValidationStatus;
    expiryDate?: string;
    validationResponse?: Record<string, unknown>;
  }
): Promise<PermitValidation> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    ID.unique(),
    {
      tenantId,
      vehicleId: data.vehicleId || null,
      driverId: data.driverId || null,
      validationType: data.validationType,
      referenceNumber: data.referenceNumber,
      status: data.status,
      validatedAt: now,
      expiryDate: data.expiryDate || null,
      validationResponse: data.validationResponse 
        ? JSON.stringify(data.validationResponse) 
        : null,
      createdAt: now,
    }
  ) as unknown as PermitValidation;
}

export async function getValidationById(
  validationId: string
): Promise<PermitValidation | null> {
  const { databases } = createAdminClient();
  
  try {
    const doc = await databases.getDocument(
      databaseId,
      COLLECTIONS.PERMIT_VALIDATIONS,
      validationId
    );
    
    return {
      ...doc,
      validationResponse: doc.validationResponse 
        ? JSON.parse(doc.validationResponse as string) 
        : null,
    } as unknown as PermitValidation;
  } catch {
    return null;
  }
}

export async function getValidationsByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    validationType?: ValidationType;
    status?: PermitValidationStatus;
  }
): Promise<PaginatedResponse<PermitValidation>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('validatedAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (filters?.validationType) {
    queries.push(Query.equal('validationType', filters.validationType));
  }
  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    queries
  );
  
  const documents = response.documents.map(doc => ({
    ...doc,
    validationResponse: doc.validationResponse 
      ? JSON.parse(doc.validationResponse as string) 
      : null,
  })) as unknown as PermitValidation[];
  
  return {
    documents,
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getValidationsByVehicle(
  vehicleId: string
): Promise<PermitValidation[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    [
      Query.equal('vehicleId', vehicleId),
      Query.orderDesc('validatedAt'),
      Query.limit(50),
    ]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    validationResponse: doc.validationResponse 
      ? JSON.parse(doc.validationResponse as string) 
      : null,
  })) as unknown as PermitValidation[];
}

export async function getValidationsByDriver(
  driverId: string
): Promise<PermitValidation[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    [
      Query.equal('driverId', driverId),
      Query.orderDesc('validatedAt'),
      Query.limit(50),
    ]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    validationResponse: doc.validationResponse 
      ? JSON.parse(doc.validationResponse as string) 
      : null,
  })) as unknown as PermitValidation[];
}

export async function getLatestValidation(
  tenantId: string,
  referenceNumber: string,
  validationType: ValidationType
): Promise<PermitValidation | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('referenceNumber', referenceNumber),
      Query.equal('validationType', validationType),
      Query.orderDesc('validatedAt'),
      Query.limit(1),
    ]
  );
  
  if (response.documents.length === 0) return null;
  
  const doc = response.documents[0];
  return {
    ...doc,
    validationResponse: doc.validationResponse 
      ? JSON.parse(doc.validationResponse as string) 
      : null,
  } as unknown as PermitValidation;
}

export async function getInvalidPermits(
  tenantId: string
): Promise<PermitValidation[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.equal('status', 'invalid'),
        Query.equal('status', 'expired'),
      ]),
      Query.orderDesc('validatedAt'),
      Query.limit(100),
    ]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    validationResponse: doc.validationResponse 
      ? JSON.parse(doc.validationResponse as string) 
      : null,
  })) as unknown as PermitValidation[];
}

export async function getValidationStats(
  tenantId: string
): Promise<{
  total: number;
  valid: number;
  invalid: number;
  expired: number;
  pending: number;
}> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.PERMIT_VALIDATIONS,
    [
      Query.equal('tenantId', tenantId),
      Query.limit(1000),
    ]
  );
  
  const validations = response.documents as unknown as PermitValidation[];
  
  return {
    total: validations.length,
    valid: validations.filter(v => v.status === 'valid').length,
    invalid: validations.filter(v => v.status === 'invalid').length,
    expired: validations.filter(v => v.status === 'expired').length,
    pending: validations.filter(v => v.status === 'pending').length,
  };
}
