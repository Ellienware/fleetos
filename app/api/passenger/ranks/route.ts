import { NextResponse } from 'next/server';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination');
  if (!destination) {
    return NextResponse.json({ error: 'Destination required' }, { status: 400 });
  }

  const { databases } = createAdminClient();

  // 1. Find routes matching destination (partial match, case-insensitive)
  const routes = await databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.ROUTES, [
    Query.contains('destination', destination),
    Query.equal('status', 'active'),
  ]);
  if (routes.documents.length === 0) {
    return NextResponse.json({ ranks: [] });
  }

  const routeIds = routes.documents.map(r => r.$id);

  // 2. Find rank_route associations
  const rankRoutes = await databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.RANK_ROUTES, [
    Query.equal('routeId', routeIds),
    Query.equal('isActive', true),
  ]);
  const rankIds = [...new Set(rankRoutes.documents.map(rr => rr.rankId))];
  if (rankIds.length === 0) return NextResponse.json({ ranks: [] });

  // 3. Get ranks
  const ranks = await databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.RANKS, [
    Query.equal('$id', rankIds),
    Query.equal('isActive', true),
  ]);

  // Helper to parse location if stored as string
  const parseLocation = (loc: any) => {
    if (typeof loc === 'string') {
      try { return JSON.parse(loc); } catch { return { lat: 0, lng: 0 }; }
    }
    return loc;
  };

  // 4. Build result
  const result = await Promise.all(ranks.documents.map(async (rank) => {
    const routesForRank = rankRoutes.documents.filter(rr => rr.rankId === rank.$id);
    const routeDetails = await Promise.all(routesForRank.map(async (rr) => {
      const route = routes.documents.find(r => r.$id === rr.routeId);
      if (!route) return null; // skip if route not found

      const queue = await databases.listDocuments(APPWRITE_CONFIG.databaseId, COLLECTIONS.RANK_QUEUES, [
        Query.equal('rankId', rank.$id),
        Query.equal('routeId', rr.routeId),
        Query.equal('status', 'waiting'),
      ]);
      return {
        id: route.$id,
        origin: route.origin,
        destination: route.destination,
        baseFare: route.baseFare,
        queueLength: queue.total,
        estimatedWaitMinutes: queue.total * 5,
      };
    }));
    // Filter out null entries
    const validRouteDetails = routeDetails.filter(d => d !== null);
    return {
      id: rank.$id,
      name: rank.name,
      location: parseLocation(rank.location),
      routes: validRouteDetails,
    };
  }));

  return NextResponse.json({ ranks: result });
}