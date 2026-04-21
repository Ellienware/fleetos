import { Query } from 'node-appwrite';

export async function getTenants(db, res) {
  try {
    const docs = await db.listDocuments(process.env.DATABASE_ID, 'tenants', [
        Query.equal('subscriptionStatus', ['active', 'trial'])
    ]);

    return res.json({
      data: docs.documents.map(t => ({
        $id: t.$id,
        name: t.name,
        slug: t.slug,
      })),
    });
  } catch (err) {
    console.error('getTenants error:', err);
    return res.json({ error: err.message }, 500);
  }
}