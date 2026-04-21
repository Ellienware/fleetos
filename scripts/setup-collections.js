const { Client, Databases, Query } = require('node-appwrite');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const required = ['NEXT_PUBLIC_APPWRITE_ENDPOINT', 'NEXT_PUBLIC_APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'];
for (const v of required) {
  if (!process.env[v]) {
    console.error(`❌ Missing: ${v}`);
    process.exit(1);
  }
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'routes';

async function fixStops() {
  try {
    // Delete the existing stops attribute (which is an array type)
    console.log('Deleting existing "stops" attribute...');
    try {
      await databases.deleteAttribute(DATABASE_ID, COLLECTION_ID, 'stops');
      console.log('  ✓ Deleted "stops" attribute');
    } catch (err) {
      if (err.code === 404) console.log('  ⏩ "stops" attribute not found, skipping delete');
      else throw err;
    }

    // Recreate stops as string with default "[]"
    console.log('Creating "stops" as string attribute...');
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'stops', 16384, false, '[]', false);
    console.log('  ✓ Created "stops" as string');

    // Ensure polyline is string (already done, but ensure it exists)
    try {
      await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'polyline', 16384, false, '', false);
      console.log('  ✓ Created "polyline" (or already exists)');
    } catch (err) {
      if (err.code !== 409) throw err;
      console.log('  ⏩ "polyline" already exists');
    }

    // Now update all documents to set stops to JSON string if missing
    console.log('\n📦 Updating existing routes...');
    let allRoutes = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.limit(limit),
        Query.offset(offset),
      ]);
      allRoutes.push(...response.documents);
      if (response.documents.length < limit) break;
      offset += limit;
    }

    console.log(`Found ${allRoutes.length} routes.`);
    let updatedCount = 0;

    for (const route of allRoutes) {
      const updates = {};
      let needsUpdate = false;

      // Ensure stops is a JSON string
      if (route.stops === undefined || route.stops === null || typeof route.stops !== 'string') {
        // If it was an array or object, convert to JSON string
        let stopsValue = [];
        if (Array.isArray(route.stops)) stopsValue = route.stops;
        else if (route.stops && typeof route.stops === 'object') stopsValue = Object.values(route.stops);
        updates.stops = JSON.stringify(stopsValue);
        needsUpdate = true;
      }

      // Ensure polyline exists
      if (route.polyline === undefined || route.polyline === null) {
        updates.polyline = '';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, route.$id, updates);
        updatedCount++;
        console.log(`  ✅ Updated route ${route.$id} (${route.code || 'no code'})`);
      }
    }

    console.log(`\n🎉 Done. Updated ${updatedCount} out of ${allRoutes.length} routes.`);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

fixStops();