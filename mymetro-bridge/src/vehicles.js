import { Query } from 'node-appwrite';

export async function getPrimaryVehicle(db, query, res) {
  const { driverId } = query;
  if (!driverId) {
    return res.json({ error: 'driverId required' }, 400);
  }
  const assignments = await db.listDocuments(process.env.DATABASE_ID, 'driver_assignments', [
    Query.equal('driverId', driverId),
    Query.equal('isPrimary', true),
    Query.equal('status', 'active'),
  ]);
  if (assignments.documents.length === 0) {
    return res.json({ error: 'No primary vehicle assigned' }, 404);
  }
  const assignment = assignments.documents[0];
  try {
    const vehicle = await db.getDocument(process.env.DATABASE_ID, 'vehicles', assignment.vehicleId);
    return res.json({ data: vehicle });
  } catch (err) {
    console.error('Vehicle not found:', assignment.vehicleId);
    return res.json({ error: `Vehicle ${assignment.vehicleId} not found` }, 404);
  }
}

export async function getVehicle(db, query, res) {
  const { vehicleId } = query;
  if (!vehicleId) {
    return res.json({ error: 'vehicleId required' }, 400);
  }
  try {
    const vehicle = await db.getDocument(process.env.DATABASE_ID, 'vehicles', vehicleId);
    return res.json({ data: vehicle });
  } catch (err) {
    console.error('Vehicle not found:', vehicleId);
    return res.json({ error: `Vehicle ${vehicleId} not found` }, 404);
  }
}