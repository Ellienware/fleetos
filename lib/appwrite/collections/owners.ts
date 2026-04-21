import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Owner, OwnerFormData, MembershipStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

interface CreateOwnerData extends OwnerFormData {
  userId: string;
  profileId?: string;        // add this
  idDocumentUrl?: string;
  operatingPermitUrl?: string;
  membershipStatus?: MembershipStatus;
}

export async function createOwner(
  tenantId: string,
  data: CreateOwnerData
): Promise<Owner> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();
  return databases.createDocument(
    databaseId,
    COLLECTIONS.OWNERS,
    ID.unique(),
    {
      tenantId,
      userId: data.userId,
      profileId: data.profileId || null,
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      phone: data.phone,
      email: data.email,
      address: data.address,
      membershipStatus: data.membershipStatus || ('pending' as MembershipStatus),
      idDocumentUrl: data.idDocumentUrl || null,
      operatingPermitUrl: data.operatingPermitUrl || null,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Owner;
}

export async function getOwnerById(ownerId: string): Promise<Owner | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.OWNERS,
      ownerId
    ) as unknown as Owner;
  } catch {
    return null;
  }
}

export async function getOwnerByUserId(userId: string): Promise<Owner | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.OWNERS,
      [Query.equal('userId', userId), Query.limit(1)]
    );
    
    return response.documents[0] as unknown as Owner || null;
  } catch {
    return null;
  }
}

export async function getOwnerByIdNumber(
  tenantId: string,
  idNumber: string
): Promise<Owner | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.OWNERS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('idNumber', idNumber),
        Query.limit(1),
      ]
    );
    
    return response.documents[0] as unknown as Owner || null;
  } catch {
    return null;
  }
}

export async function getOwnerByEmail(
  tenantId: string,
  email: string
): Promise<Owner | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.OWNERS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('email', email.toLowerCase()),
        Query.limit(1),
      ]
    );
    
    return response.documents[0] as unknown as Owner || null;
  } catch {
    return null;
  }
}

export async function getOwnersByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    status?: MembershipStatus;
    search?: string;
  }
): Promise<PaginatedResponse<Owner>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (filters?.status) {
    queries.push(Query.equal('membershipStatus', filters.status));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.OWNERS,
    queries
  );
  
  return {
    documents: response.documents as unknown as Owner[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getPendingOwners(
  tenantId: string
): Promise<Owner[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.OWNERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'pending'),
      Query.orderAsc('createdAt'),
      Query.limit(100),
    ]
  );
  
  return response.documents as unknown as Owner[];
}

export async function updateOwner(
  ownerId: string,
  data: Partial<OwnerFormData & { 
    membershipStatus: MembershipStatus;
    approvedAt?: string;
    approvedBy?: string;
  }>
): Promise<Owner> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.OWNERS,
    ownerId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as Owner;
}

export async function approveOwner(
  ownerId: string,
  approvedBy: string
): Promise<Owner> {
  return updateOwner(ownerId, {
    membershipStatus: 'active',
    approvedAt: new Date().toISOString(),
    approvedBy,
  });
}

export async function updateOwnerStatus(
  ownerId: string,
  status: MembershipStatus
): Promise<Owner> {
  return updateOwner(ownerId, { membershipStatus: status });
}

export async function deleteOwner(ownerId: string): Promise<void> {
  const { databases } = createAdminClient();
  
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.OWNERS,
    ownerId
  );
}

export async function searchOwners(
  tenantId: string,
  searchTerm: string
): Promise<Owner[]> {
  const { databases } = createAdminClient();
  
  // Search by name or email
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.OWNERS,
    [
      Query.equal('tenantId', tenantId),
      Query.or([
        Query.contains('firstName', searchTerm),
        Query.contains('lastName', searchTerm),
        Query.contains('email', searchTerm),
        Query.contains('idNumber', searchTerm),
        Query.contains('phone', searchTerm),
      ]),
      Query.limit(50),
    ]
  );
  
  return response.documents as unknown as Owner[];
}

export async function getActiveOwnersCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.OWNERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'active'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getPendingOwnersCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.OWNERS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'pending'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getOwnerStats(tenantId: string): Promise<{
  total: number;
  active: number;
  pending: number;
  suspended: number;
}> {
  const { databases } = createAdminClient();
  
  const [totalRes, activeRes, pendingRes, suspendedRes] = await Promise.all([
    databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
      Query.equal('tenantId', tenantId),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'active'),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'pending'),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
      Query.equal('tenantId', tenantId),
      Query.equal('membershipStatus', 'suspended'),
      Query.limit(1),
    ]),
  ]);
  
  return {
    total: totalRes.total,
    active: activeRes.total,
    pending: pendingRes.total,
    suspended: suspendedRes.total,
  };
}

export async function updateOwnerMembershipStatus(
  ownerId: string,
  status: MembershipStatus
): Promise<Owner> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.OWNERS,
    ownerId,
    {
      membershipStatus: status,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as Owner;
}
