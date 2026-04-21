import { NextResponse } from 'next/server';
import { createAdminClient, ID } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, STORAGE_BUCKETS } from '@/lib/appwrite/config';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'id' or 'permit'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, or PDF' }, { status: 400 });
    }

    const { storage } = createAdminClient();
    // Use the existing bucket 'docs' (ID from STORAGE_BUCKETS.ID_DOCUMENTS)
    const bucketId = STORAGE_BUCKETS.ID_DOCUMENTS; // 'docs'

    const fileId = ID.unique();
    await storage.createFile(bucketId, fileId, file);

    // Public URL (bucket must have read permission for `*`)
    const publicUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${APPWRITE_CONFIG.projectId}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}