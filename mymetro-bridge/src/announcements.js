import { Query } from 'node-appwrite';

export async function getAnnouncements(db, query, res) {
  const { tenantId, limit } = query;

  if (!tenantId) {
    return res.json({ error: 'tenantId required' }, 400);
  }

  const queries = [
    Query.equal('tenantId', tenantId),
    Query.equal('type', 'announcement'),
    Query.orderDesc('createdAt'),
  ];

  if (limit) {
    queries.push(Query.limit(parseInt(limit)));
  }

  const docs = await db.listDocuments(
    process.env.DATABASE_ID,
    'notifications',
    queries
  );

  return res.json({ data: docs.documents });
}