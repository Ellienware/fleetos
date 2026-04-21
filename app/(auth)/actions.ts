// app/(auth)/actions.ts
'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite/server';
import { createSession } from '@/lib/auth/session';
import { createTenant } from '@/lib/appwrite/collections/tenants';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';

export async function login(formData: FormData): Promise<{ error?: string; success?: boolean; role?: string; tenantId?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  if (!email || !password) return { error: 'Email and password are required' };

  try {
    const { account, databases } = createAdminClient();
    // Verify credentials – we still need the Appwrite session to get userId
    const session = await account.createEmailPasswordSession(email, password);
    const userId = session.userId;

    // Fetch profile from `profiles` collection
    const profiles = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    );
    if (profiles.documents.length === 0) return { error: 'User profile not found' };
    const profile = profiles.documents[0];

    // Create JWT session (userId, role, tenantId)
    await createSession(userId, profile.role, profile.tenantId, profile.name);

    // Optionally delete the temporary Appwrite session (optional)
    // await account.deleteSession(session.$id);

    return { success: true, role: profile.role, tenantId: profile.tenantId };
  } catch (error) {
    console.error('Login error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 401) {
      return { error: 'Invalid email or password' };
    }
    return { error: 'Failed to sign in. Please try again.' };
  }
}

function formatPhoneNumber(raw: string): string | null {
  let cleaned = raw.trim();
  if (!cleaned) return null;
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d+]/g, '');
  if (!hasPlus) {
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    cleaned = '+27' + cleaned;
  }
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  const digits = cleaned.slice(1).replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 15) return null;
  return '+' + digits;
}

export async function register(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const associationName = formData.get('associationName') as string;
  const registrationNumber = formData.get('registrationNumber') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const rawPhone = formData.get('phone') as string;
  const password = formData.get('password') as string;

  if (!associationName || !registrationNumber || !name || !email || !rawPhone || !password) {
    return { error: 'All fields are required' };
  }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const phone = formatPhoneNumber(rawPhone);
  if (!phone) return { error: 'Invalid phone number. Use international format, e.g., +27 12 345 6789.' };

  try {
    const { users, databases } = createAdminClient();

    // 1. Check if tenant already exists (by slug)
    const slug = associationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const existingTenant = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.TENANTS,
      [Query.equal('slug', slug), Query.limit(1)]
    );
    if (existingTenant.documents.length > 0) {
      return { error: 'An association with this name already exists' };
    }

    // 2. Check if email already used (Appwrite user or profile)
    const existingUser = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.PROFILES,
      [Query.equal('email', email), Query.limit(1)]
    );
    if (existingUser.documents.length > 0) {
      return { error: 'An account with this email already exists' };
    }

    // 3. Create Appwrite user
    const authUser = await users.create(ID.unique(), email, phone, password, name);

    // 4. Create tenant
    const tenant = await createTenant({
      name: associationName,
      address: '',
      phone,
      email,
      registrationNumber,
      membershipFee: 500,
    });

    // 5. Create profile (in `profiles` collection)
    const profileId = ID.unique();
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.PROFILES,
      profileId,
      {
        userId: authUser.$id,
        email,
        name,
        role: 'ASSOCIATION_ADMIN',
        tenantId: tenant.$id,
        phone,
        status: 'active',
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 409) {
      return { error: 'An account with this email already exists' };
    }
    return { error: 'Failed to create account. Please try again.' };
  }
}


export async function logout(): Promise<void> {
  const { deleteSession } = await import('@/lib/auth/session');
  await deleteSession();
}

