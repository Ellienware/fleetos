import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Fine, FineFormData, FineStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createFine(
  tenantId: string,
  issuedBy: string,
  data: FineFormData
): Promise<Fine> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.FINES,
    ID.unique(),
    {
      tenantId,
      ownerId: data.ownerId,
      vehicleId: data.vehicleId || null,
      type: data.type,
      description: data.description,
      amount: data.amount,
      status: 'pending' as FineStatus,
      issuedBy,
      issuedAt: now,
      paidAt: null,
      paymentId: null,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Fine;
}

export async function getFineById(fineId: string): Promise<Fine | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.FINES,
      fineId
    ) as unknown as Fine;
  } catch {
    return null;
  }
}

export async function getFinesByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  status?: FineStatus
): Promise<PaginatedResponse<Fine>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('issuedAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (status) {
    queries.push(Query.equal('status', status));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.FINES,
    queries
  );
  
  return {
    documents: response.documents as unknown as Fine[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getFinesByOwner(ownerId: string): Promise<Fine[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.FINES,
    [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('issuedAt'),
    ]
  );
  
  return response.documents as unknown as Fine[];
}

export async function updateFine(
  fineId: string,
  data: Partial<Pick<Fine, 'status' | 'paidAt' | 'paymentId'>>
): Promise<Fine> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.FINES,
    fineId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as Fine;
}

export async function markFinePaid(fineId: string, paymentId: string): Promise<Fine> {
  return updateFine(fineId, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    paymentId,
  });
}

export async function waiveFine(fineId: string): Promise<Fine> {
  return updateFine(fineId, {
    status: 'waived',
  });
}

export async function getPendingFinesCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.FINES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'pending'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getPendingFinesTotal(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.FINES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'pending'),
    ]
  );
  
  return (response.documents as unknown as Fine[]).reduce(
    (sum, fine) => sum + fine.amount,
    0
  );
}

export async function getOwnerPendingFines(ownerId: string): Promise<Fine[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.FINES,
    [
      Query.equal('ownerId', ownerId),
      Query.equal('status', 'pending'),
      Query.orderDesc('issuedAt'),
    ]
  );
  
  return response.documents as unknown as Fine[];
}
