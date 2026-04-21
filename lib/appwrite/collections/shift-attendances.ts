import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { ShiftAttendance, AttendanceStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createShiftAttendance(
  tenantId: string,
  data: {
    shiftId: string;
    driverId: string;
    vehicleId: string;
  }
): Promise<ShiftAttendance> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    ID.unique(),
    {
      tenantId,
      shiftId: data.shiftId,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      status: 'on_time' as AttendanceStatus,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as ShiftAttendance;
}

export async function getAttendanceById(
  attendanceId: string
): Promise<ShiftAttendance | null> {
  const { databases } = createAdminClient();
  
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.SHIFT_ATTENDANCES,
      attendanceId
    ) as unknown as ShiftAttendance;
  } catch {
    return null;
  }
}

export async function getAttendanceByShift(
  shiftId: string
): Promise<ShiftAttendance | null> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    [
      Query.equal('shiftId', shiftId),
      Query.limit(1),
    ]
  );
  
  return response.documents[0] as unknown as ShiftAttendance || null;
}

export async function getAttendancesByDriver(
  driverId: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<ShiftAttendance>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    [
      Query.equal('driverId', driverId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
  
  return {
    documents: response.documents as unknown as ShiftAttendance[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getAttendancesByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: {
    status?: AttendanceStatus;
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<ShiftAttendance>> {
  const { databases } = createAdminClient();
  
  const offset = (page - 1) * limit;
  const queries = [
    Query.equal('tenantId', tenantId),
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    Query.offset(offset),
  ];
  
  if (filters?.status) {
    queries.push(Query.equal('status', filters.status));
  }
  if (filters?.startDate) {
    queries.push(Query.greaterThanEqual('clockInTime', filters.startDate));
  }
  if (filters?.endDate) {
    queries.push(Query.lessThanEqual('clockInTime', filters.endDate));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    queries
  );
  
  return {
    documents: response.documents as unknown as ShiftAttendance[],
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function clockIn(
  attendanceId: string,
  latitude: number,
  longitude: number,
  status: AttendanceStatus = 'on_time'
): Promise<ShiftAttendance> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    attendanceId,
    {
      clockInTime: new Date().toISOString(),
      clockInLatitude: latitude,
      clockInLongitude: longitude,
      status,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as ShiftAttendance;
}

export async function clockOut(
  attendanceId: string,
  latitude: number,
  longitude: number
): Promise<ShiftAttendance> {
  const { databases } = createAdminClient();
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    attendanceId,
    {
      clockOutTime: new Date().toISOString(),
      clockOutLatitude: latitude,
      clockOutLongitude: longitude,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as ShiftAttendance;
}

export async function updateAttendanceStatus(
  attendanceId: string,
  status: AttendanceStatus,
  notes?: string
): Promise<ShiftAttendance> {
  const { databases } = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  
  if (notes) {
    updateData.notes = notes;
  }
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    attendanceId,
    updateData
  ) as unknown as ShiftAttendance;
}

export async function getAttendanceStats(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{
  total: number;
  onTime: number;
  late: number;
  absent: number;
}> {
  const { databases } = createAdminClient();
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.SHIFT_ATTENDANCES,
    [
      Query.equal('tenantId', tenantId),
      Query.greaterThanEqual('createdAt', startDate),
      Query.lessThanEqual('createdAt', endDate),
      Query.limit(1000),
    ]
  );
  
  const attendances = response.documents as unknown as ShiftAttendance[];
  
  return {
    total: attendances.length,
    onTime: attendances.filter(a => a.status === 'on_time').length,
    late: attendances.filter(a => a.status === 'late').length,
    absent: attendances.filter(a => a.status === 'absent').length,
  };
}

export async function clockInForShift(
  shiftId: string,
  driverId: string,
  vehicleId: string,
  tenantId: string,
  latitude: number,
  longitude: number,
  scheduledStart: string
): Promise<ShiftAttendance> {
  const { databases } = createAdminClient();
  
  const now = new Date();
  const scheduledTime = new Date(scheduledStart);
  
  // Determine if on time or late (15 minute grace period)
  const gracePeriodMs = 15 * 60 * 1000;
  const status: AttendanceStatus = now.getTime() <= scheduledTime.getTime() + gracePeriodMs
    ? 'on_time'
    : 'late';
  
  // Check for existing attendance
  let attendance = await getAttendanceByShift(shiftId);
  
  if (!attendance) {
    // Create new attendance record
    attendance = await createShiftAttendance(tenantId, {
      shiftId,
      driverId,
      vehicleId,
    });
  }
  
  // Clock in
  return clockIn(attendance.$id, latitude, longitude, status);
}
