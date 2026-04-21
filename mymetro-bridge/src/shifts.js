import { Query } from 'node-appwrite';

export async function getDriverShifts(db, query, res) {
  const { driverId, fromDate } = query;

  if (!driverId) {
    return res.json({ error: 'driverId required' }, 400);
  }

  const today = fromDate || new Date().toISOString().split('T')[0];

  const shifts = await db.listDocuments(process.env.DATABASE_ID, 'shifts', [
    Query.equal('driverId', driverId),
    Query.greaterThanEqual('startTime', today),
    Query.equal('status', 'scheduled'),
  ]);

  return res.json({ data: shifts.documents });
}