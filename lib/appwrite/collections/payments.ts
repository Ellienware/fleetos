import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { MembershipPayment, PaymentType, PaymentStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createPayment(data: {
  tenantId: string;
  ownerId: string;
  amount: number;
  paymentType: PaymentType;
  period: string;
  paystackReference?: string;
}): Promise<MembershipPayment> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    ID.unique(),
    {
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      amount: data.amount,
      paymentType: data.paymentType,
      status: 'pending' as PaymentStatus,
      paystackReference: data.paystackReference || '',
      paystackTransactionId: '',
      period: data.period,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as MembershipPayment;
}

export async function getPaymentById(paymentId: string): Promise<MembershipPayment | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.MEMBERSHIP_PAYMENTS,
      paymentId
    ) as unknown as MembershipPayment;
  } catch {
    return null;
  }
}

export async function getPaymentByReference(reference: string): Promise<MembershipPayment | null> {
  const { databases } = createAdminClient();
  
  try {
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.MEMBERSHIP_PAYMENTS,
      [Query.equal('paystackReference', reference), Query.limit(1)]
    );
    
    return response.documents[0] as unknown as MembershipPayment || null;
  } catch {
    return null;
  }
}

export async function getPaymentsByTenant(
  tenantId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<MembershipPayment>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as MembershipPayment[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getPaymentsByOwner(ownerId: string): Promise<MembershipPayment[]> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('createdAt'),
    ]
  );
  
  return response.documents as unknown as MembershipPayment[];
}

export async function updatePayment(
  paymentId: string,
  data: Partial<Pick<MembershipPayment, 'status' | 'paystackTransactionId' | 'paidAt'>>
): Promise<MembershipPayment> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    paymentId,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as MembershipPayment;
}

export async function markPaymentCompleted(
  paymentId: string,
  transactionId: string
): Promise<MembershipPayment> {
  return updatePayment(paymentId, {
    status: 'completed',
    paystackTransactionId: transactionId,
    paidAt: new Date().toISOString(),
  });
}

export async function getPendingPaymentsCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'pending'),
      Query.limit(1),
    ]
  );
  
  return response.total;
}

export async function getTenantRevenue(tenantId: string, startDate?: string, endDate?: string): Promise<number> {
  const { databases } = createAdminClient();
  
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.equal('status', 'completed'),
  ];
  
  if (startDate) {
    queries.push(Query.greaterThanEqual('paidAt', startDate));
  }
  if (endDate) {
    queries.push(Query.lessThanEqual('paidAt', endDate));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    queries
  );
  
  return (response.documents as unknown as MembershipPayment[]).reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
}

export async function getOwnerPaymentHistory(
  ownerId: string,
  year?: number
): Promise<MembershipPayment[]> {
  const { databases } = createAdminClient();
  
  const queries = [
    Query.equal('ownerId', ownerId),
    Query.orderDesc('createdAt'),
  ];
  
  if (year) {
    queries.push(Query.startsWith('period', year.toString()));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    queries
  );
  
  return response.documents as unknown as MembershipPayment[];
}

export async function createManualPayment(data: {
  tenantId: string;
  ownerId: string;
  amount: number;
  period: string;
}): Promise<MembershipPayment> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  return databases.createDocument(
    databaseId,
    COLLECTIONS.MEMBERSHIP_PAYMENTS,
    ID.unique(),
    {
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      amount: data.amount,
      paymentType: 'membership',
      status: 'completed',
      paystackReference: `MANUAL-${Date.now()}`,
      paystackTransactionId: '',
      period: data.period,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as MembershipPayment;
}