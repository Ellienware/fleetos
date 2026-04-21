import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Shift, ShiftFormData, ShiftStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createShift(
  tenantId: string,
  ownerId: string,
  data: ShiftFormData
): Promise<Shift> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  return databases.createDocument(
    databaseId,
    COLLECTIONS.SHIFTS,
    ID.unique(),
    {
      tenantId,
      ownerId,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      routeId: data.routeId || null,
      startTime: data.scheduledStart,      // map to startTime
      endTime: data.scheduledEnd,          // map to endTime
      status: 'scheduled' as ShiftStatus,
      notes: data.notes || null,
    }
  ) as unknown as Shift;
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  const { databases } = createAdminClient();
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.SHIFTS,
      shiftId
    ) as unknown as Shift;
  } catch {
    return null;
  }
}

export async function getShiftsByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    status?: ShiftStatus;
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<Shift>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('startTime'),           // changed
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  if (filters?.startDate) {
    queries.push(Query.greaterThanEqual('startTime', filters.startDate));
  }
  if (filters?.endDate) {
    queries.push(Query.lessThanEqual('startTime', filters.endDate));
  }

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    queries
  );

  return {
    documents: response.documents as unknown as Shift[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getShiftsByOwner(
  ownerId: string,
  page = 1,
  limit = 25,
  filters?: {
    status?: ShiftStatus;
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<Shift>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('ownerId', ownerId),
    Query.orderDesc('startTime'),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  if (filters?.startDate) {
    queries.push(Query.greaterThanEqual('startTime', filters.startDate));
  }
  if (filters?.endDate) {
    queries.push(Query.lessThanEqual('startTime', filters.endDate));
  }

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    queries
  );

  return {
    documents: response.documents as unknown as Shift[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getShiftsByDriver(
  driverId: string,
  page = 1,
  limit = 25,
  filters?: {
    status?: ShiftStatus;
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<Shift>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('driverId', driverId),
    Query.orderDesc('startTime'),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  if (filters?.startDate) {
    queries.push(Query.greaterThanEqual('startTime', filters.startDate));
  }
  if (filters?.endDate) {
    queries.push(Query.lessThanEqual('startTime', filters.endDate));
  }

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    queries
  );

  return {
    documents: response.documents as unknown as Shift[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getUpcomingShiftsForDriver(
  driverId: string,
  limit = 10
): Promise<Shift[]> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    [
      Query.equal('driverId', driverId),
      Query.equal('status', 'scheduled'),
      Query.greaterThanEqual('startTime', now),
      Query.orderAsc('startTime'),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Shift[];
}

export async function getUpcomingShiftsForOwner(
  ownerId: string,
  limit = 10
): Promise<Shift[]> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    [
      Query.equal('ownerId', ownerId),
      Query.equal('status', 'scheduled'),
      Query.greaterThanEqual('startTime', now),
      Query.orderAsc('startTime'),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Shift[];
}

export async function getActiveShiftsCount(tenantId: string): Promise<number> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'in_progress'),
      Query.limit(1),
    ]
  );
  return response.total;
}

export async function updateShift(
  shiftId: string,
  data: Partial<ShiftFormData & {
    status: ShiftStatus;
    actualStart?: string;
    actualEnd?: string;
  }>
): Promise<Shift> {
  const { databases } = createAdminClient();
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  // Map scheduledStart/End to startTime/endTime if present
  if (data.scheduledStart) updateData.startTime = data.scheduledStart;
  if (data.scheduledEnd) updateData.endTime = data.scheduledEnd;
  delete updateData.scheduledStart;
  delete updateData.scheduledEnd;

  return databases.updateDocument(
    databaseId,
    COLLECTIONS.SHIFTS,
    shiftId,
    updateData
  ) as unknown as Shift;
}

export async function startShift(shiftId: string): Promise<Shift> {
  return updateShift(shiftId, {
    status: 'in_progress',
    actualStart: new Date().toISOString(),
  });
}

export async function completeShift(shiftId: string): Promise<Shift> {
  return updateShift(shiftId, {
    status: 'completed',
    actualEnd: new Date().toISOString(),
  });
}

export async function cancelShift(shiftId: string): Promise<Shift> {
  return updateShift(shiftId, { status: 'cancelled' });
}

export async function deleteShift(shiftId: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.SHIFTS,
    shiftId
  );
}

export async function getShiftsNeedingReminder(
  minutesBefore = 60
): Promise<Shift[]> {
  const { databases } = createAdminClient();
  const now = new Date();
  const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000);

  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    [
      Query.equal('status', 'scheduled'),
      Query.greaterThanEqual('startTime', now.toISOString()),
      Query.lessThanEqual('startTime', reminderTime.toISOString()),
      Query.limit(100),
    ]
  );

  return response.documents as unknown as Shift[];
}

export async function getShiftsByDateRange(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Shift[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFTS,
    [
      Query.equal('tenantId', tenantId),
      Query.greaterThanEqual('startTime', startDate),
      Query.lessThanEqual('startTime', endDate),
      Query.orderAsc('startTime'),
      Query.limit(500),
    ]
  );
  return response.documents as unknown as Shift[];
}