import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { RankQueueEntry, RankQueueStatus } from '@/types';
import { toQueueEntry } from '@/lib/mappers/queue.mapper';

const { databaseId } = APPWRITE_CONFIG;

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function getDemandLevel(queueLength: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (queueLength > 20) return 'HIGH';
  if (queueLength > 10) return 'MEDIUM';
  return 'LOW';
}

function getBatchSize(demand: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  if (demand === 'HIGH') return 4;
  if (demand === 'MEDIUM') return 2;
  return 1;
}

function getTimeoutMinutes(demand: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  if (demand === 'HIGH') return 1;
  if (demand === 'MEDIUM') return 2;
  return 3;
}

// Fix: renamed `entry` param to avoid any ambiguity; no variable shadowing
function computeScore(queueEntry: RankQueueEntry, now: number): number {
  const waitingTime   = (now - new Date(queueEntry.enteredAt).getTime()) / 1000;
  const priorityBoost = (queueEntry as any).priority === 'VIP' ? 1000 : 0;
  const skipBoost     = (queueEntry.timesSkipped ?? 0) * 300;
  return waitingTime + priorityBoost + skipBoost;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function addToQueue(
  data: Omit<RankQueueEntry, '$id'>
): Promise<RankQueueEntry> {
  const { databases } = createAdminClient();
  return databases.createDocument(
    databaseId,
    COLLECTIONS.RANK_QUEUES,
    ID.unique(),
    data
  ) as unknown as RankQueueEntry;
}

export async function getQueueForRank(
  rankId: string,
  status?: string
): Promise<RankQueueEntry[]> {
  const { databases } = createAdminClient();

  const queries = [
    Query.equal('rankId', rankId),
    Query.orderAsc('enteredAt'),
  ];
  if (status) queries.push(Query.equal('status', status));

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.RANK_QUEUES,
    queries
  );

  return response.documents.map(toQueueEntry);
}

export async function getQueueForRoute(
  rankId: string,
  routeId: string,
  status?: RankQueueStatus
): Promise<RankQueueEntry[]> {
  const { databases } = createAdminClient();

  const queries = [
    Query.equal('rankId', rankId),
    Query.equal('routeId', routeId),
    Query.orderAsc('enteredAt'),
  ];
  if (status) queries.push(Query.equal('status', status));

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.RANK_QUEUES,
    queries
  );
  return response.documents.map(toQueueEntry);
}

export async function updateQueueEntry(
  entryId: string,
  data: Partial<RankQueueEntry>
): Promise<RankQueueEntry> {
  const { databases } = createAdminClient();
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.RANK_QUEUES,
    entryId,
    data
  ) as unknown as RankQueueEntry;
}

export async function removeFromQueue(entryId: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(databaseId, COLLECTIONS.RANK_QUEUES, entryId);
}

export async function getNextInQueue(
  rankId: string,
  routeId: string
): Promise<RankQueueEntry | null> {
  const queue = await getQueueForRoute(rankId, routeId, 'waiting');
  if (!queue.length) return null;

  const now = Date.now();
  return [...queue]
    .map(q => ({ entry: q, score: computeScore(q, now) }))
    .sort((a, b) => b.score - a.score)[0].entry;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function callDriver(
  entry: RankQueueEntry,
  demand: 'HIGH' | 'MEDIUM' | 'LOW'
): Promise<void> {
  const { databases } = createAdminClient();

  // Re-fetch to guard against race conditions
  const latest = await databases.getDocument(
    databaseId,
    COLLECTIONS.RANK_QUEUES,
    entry.$id
  );
  if (latest.status !== 'waiting') return;

  const timeoutMinutes = getTimeoutMinutes(demand);
  const deadline       = new Date(Date.now() + timeoutMinutes * 60_000).toISOString();

  await databases.updateDocument(databaseId, COLLECTIONS.RANK_QUEUES, entry.$id, {
    status:          'called',
    calledAt:        new Date().toISOString(),
    loadingDeadline: deadline,
  });

  // TODO: push notification to driver
}

export async function smartDispatch(
  rankId: string,
  routeId: string
): Promise<void> {
  const { databases } = createAdminClient();

  const queue = await getQueueForRoute(rankId, routeId, 'waiting');
  if (!queue.length) return;

  const demand     = getDemandLevel(queue.length);
  const now        = Date.now();
  const scored     = [...queue]
    .map(q => ({ entry: q, score: computeScore(q, now) }))
    .sort((a, b) => b.score - a.score);

  const route = await databases.getDocument(databaseId, COLLECTIONS.ROUTES, routeId);

  const availableSlots =
    (route.maxVehicles ?? 0) - (route.currentVehicleCount ?? 0);
  if (availableSlots <= 0) return;

  const batchSize = Math.min(getBatchSize(demand), availableSlots);
  const selected  = scored.slice(0, batchSize);

  // Fix: error-isolated loop — one failure doesn't kill the batch
  const results = await Promise.allSettled(
    selected.map(({ entry }) => callDriver(entry, demand))
  );

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        `smartDispatch: failed to call driver for entry ${selected[i].entry.$id}:`,
        result.reason
      );
    }
  });
}