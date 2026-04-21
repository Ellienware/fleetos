import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Tenant, SubscriptionStatus, TenantFormData } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createTenant(data: TenantFormData): Promise<Tenant> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  const slug = generateSlug(data.name);
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.TENANTS,
    ID.unique(),
    {
      name: data.name,
      slug,
      logo: '',
      address: data.address,
      phone: data.phone,
      email: data.email,
      registrationNumber: data.registrationNumber,
      subscriptionId: '',
      subscriptionStatus: 'trial' as SubscriptionStatus,
      settings: JSON.stringify({
        membershipFee: data.membershipFee,
        currency: 'ZAR',
        timezone: 'Africa/Johannesburg',
      }),
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Tenant;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { databases } = createAdminClient();
  
  try {
    const doc = await databases.getDocument(
      databaseId,
      COLLECTIONS.TENANTS,
      tenantId
    );
    
    return {
      ...doc,
      settings: typeof doc.settings === 'string' ? JSON.parse(doc.settings) : doc.settings,
    } as unknown as Tenant;
  } catch {
    return null;
  }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.TENANTS,
      [Query.equal('slug', slug), Query.limit(1)]
    );
    
    if (response.documents.length === 0) return null;
    
    const doc = response.documents[0];
    return {
      ...doc,
      settings: typeof doc.settings === 'string' ? JSON.parse(doc.settings) : doc.settings,
    } as unknown as Tenant;
  } catch {
    return null;
  }
}

export async function getAllTenants(): Promise<Tenant[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.TENANTS,
    [Query.orderDesc('createdAt')]
  );
  
  return response.documents.map(doc => ({
    ...doc,
    settings: typeof doc.settings === 'string' ? JSON.parse(doc.settings) : doc.settings,
  })) as unknown as Tenant[];
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Omit<Tenant, '$id' | 'slug' | 'createdAt'>>
): Promise<Tenant> {
  const { databases } = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  if (data.settings) {
    updateData.settings = JSON.stringify(data.settings);
  }
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.TENANTS,
    tenantId,
    updateData
  ) as unknown as Tenant;
}

export async function updateTenantSubscription(
  tenantId: string,
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<Tenant> {
  return updateTenant(tenantId, {
    subscriptionId,
    subscriptionStatus: status,
  });
}

export async function getTenantStats(tenantId: string): Promise<{
  ownersCount: number;
  vehiclesCount: number;
  routesCount: number;
}> {
  const { databases } = createAdminClient();
  
  const [owners, vehicles, routes] = await Promise.all([
    databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
      Query.equal('tenantId', tenantId),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.VEHICLES, [
      Query.equal('tenantId', tenantId),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, COLLECTIONS.ROUTES, [
      Query.equal('tenantId', tenantId),
      Query.limit(1),
    ]),
  ]);
  
  return {
    ownersCount: owners.total,
    vehiclesCount: vehicles.total,
    routesCount: routes.total,
  };
}

export async function updateTenantSubscriptionStatus(
  tenantId: string,
  status: SubscriptionStatus
): Promise<Tenant> {
  return updateTenant(tenantId, {
    subscriptionStatus: status,
  });
}
