import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { User, UserRole, UserStatus } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createUser(data: {
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  phone: string;
  userId: string;
}): Promise<User> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.USERS,
    data.userId,
    {
      email: data.email,
      name: data.name,
      role: data.role,
      tenantId: data.tenantId,
      phone: data.phone,
      status: 'active' as UserStatus,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.USERS,
      userId
    ) as unknown as User;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.USERS,
      [Query.equal('email', email), Query.limit(1)]
    );
    
    return response.documents[0] as unknown as User || null;
  } catch {
    return null;
  }
}

export async function updateUser(
  userId: string,
  data: Partial<Pick<User, 'name' | 'phone' | 'status' | 'role' | 'tenantId'>>
): Promise<User> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.USERS,
    userId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as User;
}

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.USERS,
    [Query.equal('tenantId', tenantId)]
  );
  
  return response.documents as unknown as User[];
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.USERS,
    [Query.equal('role', role)]
  );
  
  return response.documents as unknown as User[];
}
