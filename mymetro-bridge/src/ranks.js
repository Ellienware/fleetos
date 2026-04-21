// src/ranks.js
import { Query, ID } from 'node-appwrite';
import { success, error } from './utils/response.js';

export async function getRanks(db, query, res) {
  const { tenantId } = query;
  if (!tenantId) {
    return error(res, 'tenantId required');
  }
  const docs = await db.listDocuments(process.env.DATABASE_ID, 'ranks', [
    Query.equal('tenantId', tenantId),
    Query.equal('isActive', true),
  ]);
  return success(res, docs.documents);
}

export async function getRankRoutes(db, query, res) {
  const { rankId } = query;
  if (!rankId) {
    return error(res, 'rankId required');
  }
  const rankRoutes = await db.listDocuments(process.env.DATABASE_ID, 'rank_routes', [
    Query.equal('rankId', rankId),
    Query.equal('isActive', true),
  ]);
  const routeIds = rankRoutes.documents.map(rr => rr.routeId);
  if (routeIds.length === 0) {
    return success(res, []);
  }
  const routes = await Promise.all(
    routeIds.map(id => db.getDocument(process.env.DATABASE_ID, 'routes', id))
  );
  return success(res, routes);
}

export async function getQueueEntry(db, query, res) {
  const { rankId, routeId, driverId } = query;
  if (!rankId || !routeId || !driverId) {
    return error(res, 'rankId, routeId, and driverId required');
  }
  const docs = await db.listDocuments(process.env.DATABASE_ID, 'rank_queues', [
    Query.equal('rankId', rankId),
    Query.equal('routeId', routeId),
    Query.equal('driverId', driverId),
    Query.orderDesc('enteredAt'),
    Query.limit(1),
  ]);
  if (docs.documents.length === 0) {
    return error(res, 'No active queue entry', 404);
  }
  return success(res, docs.documents[0]);
}

export async function createQueueEntry(db, body, res) {
  const { tenantId, rankId, routeId, driverId, vehicleId, registrationNumber } = body;
  if (!tenantId || !rankId || !routeId || !driverId || !vehicleId) {
    return error(res, 'Missing required fields');
  }
  const doc = await db.createDocument(process.env.DATABASE_ID, 'rank_queues', ID.unique(), {
    tenantId,
    rankId,
    routeId,
    driverId,
    vehicleId,
    registrationNumber,
    enteredAt: new Date().toISOString(),
    status: 'waiting',
  });
  return success(res, doc);
}

export async function updateQueueEntry(db, body, res) {
  const { entryId, status, loadingDeadline, loadedAt } = body;
  if (!entryId) return error(res, 'entryId required');
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (loadingDeadline !== undefined) updates.loadingDeadline = loadingDeadline;
  if (loadedAt !== undefined) updates.loadedAt = loadedAt;
  const doc = await db.updateDocument(process.env.DATABASE_ID, 'rank_queues', entryId, updates);
  return success(res, doc);
}