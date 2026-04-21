import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Subscription, SubscriptionPlan, SubscriptionStatus, BillingCycle } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createSubscription(data: {
  tenantId: string;
  plan: SubscriptionPlan;
  paystackSubscriptionCode?: string;
  paystackCustomerCode?: string;
  amount: number;
  billingCycle: BillingCycle;
}): Promise<Subscription> {
  const { databases } = createAdminClient();
  
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (data.billingCycle === 'yearly' ? 12 : 1));
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.SUBSCRIPTIONS,
    ID.unique(),
    {
      tenantId: data.tenantId,
      plan: data.plan,
      status: 'active' as SubscriptionStatus,
      paystackSubscriptionCode: data.paystackSubscriptionCode || '',
      paystackCustomerCode: data.paystackCustomerCode || '',
      amount: data.amount,
      billingCycle: data.billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelledAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  ) as unknown as Subscription;
}

export async function getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.SUBSCRIPTIONS,
      subscriptionId
    ) as unknown as Subscription;
  } catch {
    return null;
  }
}

export async function getSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.SUBSCRIPTIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('createdAt'),
        Query.limit(1),
      ]
    );
    
    return response.documents[0] as unknown as Subscription || null;
  } catch {
    return null;
  }
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.orderDesc('createdAt')]
  );
  
  return response.documents as unknown as Subscription[];
}

export async function updateSubscription(
  subscriptionId: string,
  data: Partial<Pick<Subscription, 'plan' | 'status' | 'amount' | 'currentPeriodStart' | 'currentPeriodEnd' | 'cancelledAt' | 'paystackSubscriptionCode' | 'paystackCustomerCode'>>
): Promise<Subscription> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as Subscription;
}

export async function cancelSubscription(subscriptionId: string): Promise<Subscription> {
  return updateSubscription(subscriptionId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  });
}

export async function renewSubscription(subscriptionId: string): Promise<Subscription> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) throw new Error('Subscription not found');
  
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (subscription.billingCycle === 'yearly' ? 12 : 1));
  
  return updateSubscription(subscriptionId, {
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelledAt: null,
  });
}

export async function getActiveSubscriptionsCount(): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SUBSCRIPTIONS,
    [
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getExpiringSubscriptions(daysAhead = 7): Promise<Subscription[]> {
  const { databases } = createAdminClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SUBSCRIPTIONS,
    [
      Query.equal('status', 'active'),
      Query.lessThanEqual('currentPeriodEnd', futureDate.toISOString()),
      Query.orderAsc('currentPeriodEnd'),
    ]
  );
  
  return response.documents as unknown as Subscription[];
}
