import { smartDispatch } from '@/lib/appwrite/collections/rank-queues';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { databases } = createAdminClient();
  const now           = new Date().toISOString();

  const summary = {
    timedOut:    0,
    dispatched:  0,
    errors:      [] as string[],
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Handle timed-out "called" entries
    // -----------------------------------------------------------------------
    const timedOut = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.RANK_QUEUES,
      [
        Query.equal('status', 'called'),
        Query.lessThan('loadingDeadline', now),
      ]
    );

    // Fix: error-isolated loop — one failure doesn't abort the rest
    await Promise.allSettled(
      timedOut.documents.map(async (entry) => {
        try {
          await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            COLLECTIONS.RANK_QUEUES,
            entry.$id,
            {
              status:       'skipped',
              skipReason:   'timeout',
              timesSkipped: (entry.timesSkipped ?? 0) + 1,
            }
          );
          summary.timedOut++;
          // Re-dispatch immediately after marking skipped
          await smartDispatch(entry.rankId, entry.routeId);
        } catch (err) {
          const msg = `timeout-handler for ${entry.$id}: ${String(err)}`;
          console.error(msg);
          summary.errors.push(msg);
        }
      })
    );

    // -----------------------------------------------------------------------
    // 2. Trigger dispatch for waiting queues
    //    Deduplicate by rankId+routeId so we call smartDispatch once per pair
    // -----------------------------------------------------------------------
    const waiting = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.RANK_QUEUES,
      [Query.equal('status', 'waiting'), Query.limit(100)]
    );

    const processed = new Set<string>();

    await Promise.allSettled(
      waiting.documents.map(async (entry) => {
        const key = `${entry.rankId}-${entry.routeId}`;
        if (processed.has(key)) return;
        processed.add(key);

        try {
          await smartDispatch(entry.rankId, entry.routeId);
          summary.dispatched++;
        } catch (err) {
          const msg = `dispatch for ${key}: ${String(err)}`;
          console.error(msg);
          summary.errors.push(msg);
        }
      })
    );
  } catch (err) {
    console.error('Cron job failed:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, summary });
}