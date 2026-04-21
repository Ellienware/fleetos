// src/index.js
import { createDB } from './utils/db.js';
import { getDriver } from './drivers.js';
import { getPrimaryVehicle, getVehicle } from './vehicles.js';
import { getVehicleRoutes, getRoute, searchRoutes } from './routes.js';
import { getDriverShifts } from './shifts.js';
import { getTenants } from './tenants.js';
import { getAnnouncements } from './announcements.js';
import { getRanks, getRankRoutes, getQueueEntry, createQueueEntry, updateQueueEntry } from './ranks.js'; // new

export default async (context) => {
  const req = context.req;
  const res = context.res;

  const headers = req.headers ?? {};
  const secret = headers['x-api-key'] ?? headers['X-Api-Key'];
  if (secret !== process.env.API_SECRET) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  const db = createDB();
  const { path, method, query, body } = req;

  try {
    if (path === '/driver' && method === 'GET') {
      return await getDriver(db, query, res);
    }
    if (path === '/vehicle' && method === 'GET') {
      return getVehicle(db, query, res);
    }
    if (path === '/driver/primary-vehicle' && method === 'GET') {
      return await getPrimaryVehicle(db, query, res);
    }
    if (path === '/vehicle/routes' && method === 'GET') {
      return await getVehicleRoutes(db, query, res);
    }
    if (path === '/search-routes' && method === 'GET') {
      return searchRoutes(db, query, res);
    }
    if (path === '/route' && method === 'GET') {
      return await getRoute(db, query, res);
    }
    if (path === '/driver/shifts' && method === 'GET') {
      return await getDriverShifts(db, query, res);
    }
    if (path === '/announcements' && method === 'GET') {
      return await getAnnouncements(db, query, res);
    }
    if (path === '/tenants' && method === 'GET') {
      return await getTenants(db, res);
    }

    // New queue endpoints
    if (path === '/ranks' && method === 'GET') {
      return await getRanks(db, query, res);
    }
    if (path === '/rank-routes' && method === 'GET') {
      return await getRankRoutes(db, query, res);
    }
    if (path === '/queue' && method === 'GET') {
      return await getQueueEntry(db, query, res);
    }
    if (path === '/queue' && method === 'POST') {
      return await createQueueEntry(db, body, res);
    }
    if (path === '/queue' && method === 'PATCH') {
      return await updateQueueEntry(db, body, res);
    }

    return res.json({ error: 'Not found' }, 404);
  } catch (err) {
    context.error(err);
    return res.json({ error: err.message }, 500);
  }
};


if (request.path === '/update-trip' && request.method === 'PATCH') {
  const authHeader = request.headers['x-api-key'];
  if (authHeader !== process.env.API_SECRET) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  const { tripId, updates } = request.body;
  if (!tripId || !updates) {
    return res.json({ error: 'tripId and updates required' }, 400);
  }

  try {
    const databaseId = process.env.DATABASE_ID;      // your mobile Appwrite DB ID
    const collectionId = process.env.COLLECTIONS_TAXI_TRIPS; // e.g., 'taxi_trips'
    await databases.updateDocument(databaseId, collectionId, tripId, updates);
    return res.json({ success: true });
  } catch (err) {
    console.error('Update trip error:', err);
    return res.json({ error: err.message }, 500);
  }
}