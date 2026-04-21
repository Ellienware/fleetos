import { Query } from 'node-appwrite';

export async function getDriver(db, query, res) {
  const { idNumber, tenantId } = query;

  if (!idNumber || !tenantId) {
    return res.json({ error: 'idNumber and tenantId required' }, 400);
  }

  const docs = await db.listDocuments(process.env.DATABASE_ID, 'drivers', [
    Query.equal('idNumber', idNumber),
    Query.equal('tenantId', tenantId),
  ]);

  if (docs.documents.length === 0) {
    return res.json({ error: 'Driver not found' }, 404);
  }

  const driver = docs.documents[0];

  return res.json({
    data: {
      driverId: driver.$id,
      tenantId: driver.tenantId,
      ownerId: driver.ownerId,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
    },
  });
}