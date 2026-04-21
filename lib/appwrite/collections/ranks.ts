import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Rank, RankFormData, RankRoute } from '@/types';
import { toRankRoute } from '@/lib/mappers/rank-route';
import { toRank } from '@/lib/mappers/rank.mapper';

const { databaseId } = APPWRITE_CONFIG;

export async function createRank(tenantId: string, data: RankFormData): Promise<Rank> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  // Store location as an object, not a string (Appwrite supports objects)
  const document = await databases.createDocument(databaseId, COLLECTIONS.RANKS, ID.unique(), {
    tenantId,
    name: data.name,
    location: JSON.stringify(data.location), // direct object
    geofenceRadius: data.geofenceRadius || null,
    autoDispatch: data.autoDispatch ?? true,
    responseTimeoutMinutes: data.responseTimeoutMinutes ?? 2,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return toRank(document);
}

export async function getRankById(rankId: string): Promise<Rank | null> {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(databaseId, COLLECTIONS.RANKS, rankId);
    return toRank(doc);
  } catch {
    return null;
  }
}

export async function getRanksByTenant(tenantId: string): Promise<Rank[]> {
  const { databases } = createAdminClient();

  const response = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    COLLECTIONS.RANKS,
    [Query.equal('tenantId', tenantId), Query.orderDesc('createdAt')]
  );

  return response.documents.map(toRank);
}

export async function updateRank(rankId: string, data: Partial<RankFormData & { isActive?: boolean }>): Promise<Rank> {
  const { databases } = createAdminClient();
  
  // Create a copy of data to modify
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
  
  // Stringify location if it exists in the update data
  if (data.location) {
    updateData.location = JSON.stringify(data.location);
  }
  
  const doc = await databases.updateDocument(databaseId, COLLECTIONS.RANKS, rankId, updateData);
  return toRank(doc);
}

// CASCADE DELETE: removes rank + all related rank_routes and rank_queues
export async function deleteRank(rankId: string): Promise<void> {
  const { databases } = createAdminClient();

  // 1. Delete all rank_route links
  const rankRoutes = await databases.listDocuments(databaseId, COLLECTIONS.RANK_ROUTES, [
    Query.equal('rankId', rankId),
  ]);
  for (const doc of rankRoutes.documents) {
    await databases.deleteDocument(databaseId, COLLECTIONS.RANK_ROUTES, doc.$id);
  }

  // 2. Delete all queue entries for this rank
  const queueEntries = await databases.listDocuments(databaseId, COLLECTIONS.RANK_QUEUES, [
    Query.equal('rankId', rankId),
  ]);
  for (const doc of queueEntries.documents) {
    await databases.deleteDocument(databaseId, COLLECTIONS.RANK_QUEUES, doc.$id);
  }

  // 3. Finally delete the rank document
  await databases.deleteDocument(databaseId, COLLECTIONS.RANKS, rankId);
}

// ----------------------------------------------------------------------
// Rank Routes (assign/remove)
// ----------------------------------------------------------------------

export async function assignRouteToRank(rankId: string, routeId: string) {
  const { databases } = createAdminClient();

  const existing = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    COLLECTIONS.RANK_ROUTES,
    [
      Query.equal('rankId', rankId),
      Query.equal('routeId', routeId),
    ]
  );

  if (existing.documents.length > 0) return;

  await databases.createDocument(
    APPWRITE_CONFIG.databaseId,
    COLLECTIONS.RANK_ROUTES,
    ID.unique(),
    {
      rankId,
      routeId,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  );
}

export async function removeRouteFromRank(rankId: string, routeId: string): Promise<void> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(databaseId, COLLECTIONS.RANK_ROUTES, [
    Query.equal('rankId', rankId),
    Query.equal('routeId', routeId),
  ]);
  if (response.documents.length > 0) {
    await databases.deleteDocument(databaseId, COLLECTIONS.RANK_ROUTES, response.documents[0].$id);
  }
}

export async function getRankRoutes(rankId: string): Promise<RankRoute[]> {
  const { databases } = createAdminClient();

  const response = await databases.listDocuments(
    APPWRITE_CONFIG.databaseId,
    COLLECTIONS.RANK_ROUTES,
    [Query.equal('rankId', rankId)]
  );

  return response.documents.map(toRankRoute);
}