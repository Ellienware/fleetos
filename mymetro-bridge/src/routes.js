import { Query } from 'node-appwrite';

export async function getVehicleRoutes(db, query, res) {
  const { vehicleId } = query;

  if (!vehicleId) {
    return res.json({ error: 'vehicleId required' }, 400);
  }

  const assignments = await db.listDocuments(process.env.DATABASE_ID, 'route_assignments', [
    Query.equal('vehicleId', vehicleId),
    Query.equal('status', 'active'),
  ]);

  const routes = await Promise.all(
    assignments.documents.map(a =>
      db.getDocument(process.env.DATABASE_ID, 'routes', a.routeId)
    )
  );

  return res.json({ data: routes });
}

export async function getRoute(db, query, res) {
  const { routeId } = query;
  if (!routeId) return res.json({ error: 'routeId required' }, 400);

  const route = await db.getDocument(process.env.DATABASE_ID, 'routes', routeId);

  // Parse stops if it's a string
  if (route.stops && typeof route.stops === 'string') {
    try {
      route.stops = JSON.parse(route.stops);
    } catch {
      route.stops = [];
    }
  } else if (!route.stops) {
    route.stops = [];
  }

  return res.json({ data: route });
}

export async function searchRoutes(db, query, res) {
  const { pickup, destination } = query;
  if (!pickup || !destination) {
    return res.json({ error: 'pickup and destination required' }, 400);
  }
  try {
    const docs = await db.listDocuments(process.env.DATABASE_ID, 'routes', [
      Query.contains('origin', pickup),
      Query.contains('destination', destination),
      Query.equal('status', 'active')
    ]);
    // Parse stops for each route
    const routes = docs.documents.map(route => {
      if (route.stops && typeof route.stops === 'string') {
        try {
          route.stops = JSON.parse(route.stops);
        } catch {
          route.stops = [];
        }
      } else if (!route.stops) {
        route.stops = [];
      }
      return route;
    });
    return res.json({ data: routes });
  } catch (err) {
    console.error('searchRoutes error:', err);
    return res.json({ error: err.message }, 500);
  }
}

