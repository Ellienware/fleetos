'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/session';
import { getOwnerById, updateOwner } from '@/lib/appwrite/collections/owners';
import {
  createVehicle,
  getVehiclesByOwner,
  updateVehicle,
  deleteVehicle,
  getVehicleByRegistration,
} from '@/lib/appwrite/collections/vehicles';
import {
  createDriver,
  getDriversByOwner,
  updateDriver,
  deleteDriver,
  getDriverByIdNumber,
} from '@/lib/appwrite/collections/drivers';
import {
  createShift,
  getShiftsByOwner,
  updateShift,
  cancelShift,
} from '@/lib/appwrite/collections/shifts';
import {
  createDriverAssignment,
  getAssignmentsByOwner,
  deactivateAssignment,  // renamed from endAssignment
} from '@/lib/appwrite/collections/driver-assignments';
import { getFinesByOwner } from '@/lib/appwrite/collections/fines';
import { getPaymentsByOwner } from '@/lib/appwrite/collections/payments';
import { createAdminClient, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import type {
  VehicleFormData,
  DriverFormData,
  ShiftFormData,
  VehicleStatus,
  DriverStatus,
} from '@/types';

// Helper to get owner session
async function getOwnerSession(tenantId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (session.role !== 'OWNER') {
    throw new Error('Access denied - Owner role required');
  }
  if (session.tenantId !== tenantId) {
    throw new Error('Access denied - Wrong tenant');
  }
  return session;
}

// Get owner ID from session
async function getOwnerId(tenantId: string): Promise<string> {
  const session = await getOwnerSession(tenantId);
  const { databases } = createAdminClient();
  const { databaseId } = APPWRITE_CONFIG;

  const response = await databases.listDocuments(databaseId, COLLECTIONS.OWNERS, [
    Query.equal('tenantId', tenantId),
    Query.equal('userId', session.userId),
    Query.limit(1),
  ]);

  if (response.documents.length === 0) {
    throw new Error('Owner record not found');
  }
  return response.documents[0].$id;
}

// ==================== PROFILE ACTIONS ====================

export async function getOwnerProfileAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  try {
    const owner = await getOwnerById(ownerId);
    if (!owner) return { success: false, error: 'Owner not found' };
    return { success: true, data: owner };
  } catch (error) {
    console.error('Failed to fetch owner profile:', error);
    return { success: false, error: 'Failed to fetch profile' };
  }
}

export async function updateOwnerProfileAction(
  tenantId: string,
  data: { phone?: string; email?: string; address?: string }
) {
  const ownerId = await getOwnerId(tenantId);
  try {
    const owner = await updateOwner(ownerId, data);
    revalidatePath(`/owner/${tenantId}/profile`);
    return { success: true, data: owner };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

// ==================== VEHICLE ACTIONS ====================

function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function getOwnerVehiclesAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const vehicles = await getVehiclesByOwner(ownerId);
    return { success: true, data: { documents: toPlainObject(vehicles), total: vehicles.length } };
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    return { success: false, error: 'Failed to fetch vehicles' };
  }
}


export async function createOwnerVehicleAction(
  tenantId: string,
  data: Omit<VehicleFormData, 'ownerId'>
) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };

  // Check for duplicate registration number
  const existingVehicle = await getVehicleByRegistration(tenantId, data.registrationNumber);
  if (existingVehicle) {
    return { success: false, error: 'A vehicle with this registration number already exists in your association.' };
  }

  try {
    // Force status to 'pending' so admin must approve
    const vehicle = await createVehicle(tenantId, { ...data, ownerId, status: 'pending' });
    revalidatePath(`/owner/${tenantId}/vehicles`);
    return { success: true, data: toPlainObject(vehicle) };
  } catch (error) {
    console.error('Failed to create vehicle:', error);
    return { success: false, error: 'Failed to create vehicle' };
  }
}

export async function updateOwnerVehicleAction(
  tenantId: string,
  vehicleId: string,
  data: Partial<VehicleFormData & { status: VehicleStatus }>
) {
  await getOwnerId(tenantId); // Verify ownership
  try {
    const vehicle = await updateVehicle(vehicleId, data);
    revalidatePath(`/owner/${tenantId}/vehicles`);
    return { success: true, data: toPlainObject(vehicle) };
  } catch (error) {
    console.error('Failed to update vehicle:', error);
    return { success: false, error: 'Failed to update vehicle' };
  }
}

export async function deleteOwnerVehicleAction(tenantId: string, vehicleId: string) {
  await getOwnerId(tenantId);
  try {
    await deleteVehicle(vehicleId);
    revalidatePath(`/owner/${tenantId}/vehicles`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete vehicle:', error);
    return { success: false, error: 'Failed to delete vehicle' };
  }
}

// ==================== DRIVER ACTIONS ====================

export async function getOwnerDriversAction(tenantId: string, page = 1, limit = 25) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const result = await getDriversByOwner(ownerId, page, limit);
    return { success: true, data: { documents: toPlainObject(result.documents), total: result.total } };
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
    return { success: false, error: 'Failed to fetch drivers' };
  }
}


export async function createOwnerDriverAction(
  tenantId: string,
  data: Omit<DriverFormData, 'ownerId' | 'profilePhotoFile'>
) {
  const existingDriver = await getDriverByIdNumber(tenantId, data.idNumber);
if (existingDriver) {
  return { success: false, error: 'A driver with this ID number already exists under your association.' };
}
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const driver = await createDriver(tenantId, ownerId, data);
    revalidatePath(`/owner/${tenantId}/drivers`);
    return { success: true, data: toPlainObject(driver) };
  } catch (error) {
    console.error('Failed to create driver:', error);
    return { success: false, error: 'Failed to create driver' };
  }
}


export async function updateOwnerDriverAction(
  tenantId: string,
  driverId: string,
  data: Partial<Omit<DriverFormData, 'ownerId' | 'profilePhotoFile'> & { status: DriverStatus }>
) {
  await getOwnerId(tenantId);
  try {
    const driver = await updateDriver(driverId, data);
    revalidatePath(`/owner/${tenantId}/drivers`);
    return { success: true, data: toPlainObject(driver) };
  } catch (error) {
    console.error('Failed to update driver:', error);
    return { success: false, error: 'Failed to update driver' };
  }
}

export async function deleteOwnerDriverAction(tenantId: string, driverId: string) {
  await getOwnerId(tenantId);
  try {
    await deleteDriver(driverId);
    revalidatePath(`/owner/${tenantId}/drivers`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete driver:', error);
    return { success: false, error: 'Failed to delete driver' };
  }
}

// ==================== DRIVER ASSIGNMENT ACTIONS ====================

export async function getOwnerAssignmentsAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  try {
    const assignments = await getAssignmentsByOwner(ownerId);
    return { success: true, data: assignments };
  } catch (error) {
    console.error('Failed to fetch assignments:', error);
    return { success: false, error: 'Failed to fetch assignments' };
  }
}

export async function assignDriverToVehicleAction(
  tenantId: string,
  data: { driverId: string; vehicleId: string; isPrimary: boolean }
) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const assignment = await createDriverAssignment(tenantId, {
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      ownerId,
      isPrimary: data.isPrimary,
    });
    revalidatePath(`/owner/${tenantId}/drivers`);
    revalidatePath(`/owner/${tenantId}/vehicles`);
    revalidatePath(`/owner/${tenantId}/assignments`);
    return { success: true, data: toPlainObject(assignment) };
  } catch (error) {
    console.error('Failed to assign driver:', error);
    return { success: false, error: 'Failed to assign driver' };
  }
}

export async function unassignDriverAction(tenantId: string, assignmentId: string) {
  await getOwnerId(tenantId); // Verify ownership
  try {
    await deactivateAssignment(assignmentId); // returns Promise<void>
    revalidatePath(`/owner/${tenantId}/drivers`);
    revalidatePath(`/owner/${tenantId}/vehicles`);
    revalidatePath(`/owner/${tenantId}/assignments`);
    return { success: true };
  } catch (error) {
    console.error('Failed to unassign driver:', error);
    return { success: false, error: 'Failed to unassign driver' };
  }
}


// ==================== SHIFT ACTIONS ====================

export async function getOwnerShiftsAction(
  tenantId: string,
  page = 1,
  limit = 25,
  filters?: { status?: string; startDate?: string; endDate?: string }
) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const result = await getShiftsByOwner(ownerId, page, limit, filters as any);
    return {
      success: true,
      data: {
        documents: toPlainObject(result.documents),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    console.error('Failed to fetch shifts:', error);
    return { success: false, error: 'Failed to fetch shifts' };
  }
}

export async function createOwnerShiftAction(tenantId: string, data: ShiftFormData) {
  const ownerId = await getOwnerId(tenantId);
  if (!ownerId) return { success: false, error: 'Owner record not found' };
  try {
    const shift = await createShift(tenantId, ownerId, data);
    revalidatePath(`/owner/${tenantId}/shifts`);
    return { success: true, data: toPlainObject(shift) };
  } catch (error) {
    console.error('Failed to create shift:', error);
    return { success: false, error: 'Failed to create shift' };
  }
}

export async function updateOwnerShiftAction(
  tenantId: string,
  shiftId: string,
  data: Partial<ShiftFormData>
) {
  await getOwnerId(tenantId);
  try {
    const shift = await updateShift(shiftId, data);
    revalidatePath(`/owner/${tenantId}/shifts`);
    return { success: true, data: toPlainObject(shift) };
  } catch (error) {
    console.error('Failed to update shift:', error);
    return { success: false, error: 'Failed to update shift' };
  }
}

export async function cancelOwnerShiftAction(tenantId: string, shiftId: string) {
  await getOwnerId(tenantId);
  try {
    const shift = await cancelShift(shiftId);
    revalidatePath(`/owner/${tenantId}/shifts`);
    return { success: true, data: toPlainObject(shift) };
  } catch (error) {
    console.error('Failed to cancel shift:', error);
    return { success: false, error: 'Failed to cancel shift' };
  }
}

// ==================== FINES ACTIONS ====================

export async function getOwnerFinesAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  try {
    const fines = await getFinesByOwner(ownerId);
    return { success: true, data: fines };
  } catch (error) {
    console.error('Failed to fetch fines:', error);
    return { success: false, error: 'Failed to fetch fines' };
  }
}

// ==================== PAYMENTS ACTIONS ====================

export async function getOwnerPaymentsAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  try {
    const payments = await getPaymentsByOwner(ownerId);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return { success: false, error: 'Failed to fetch payments' };
  }
}

// ==================== DASHBOARD STATS ====================

export async function getOwnerDashboardStatsAction(tenantId: string) {
  const ownerId = await getOwnerId(tenantId);
  try {
    // getVehiclesByOwner returns an array
    const vehicles = await getVehiclesByOwner(ownerId);
    // getDriversByOwner returns PaginatedResponse
    const driversResult = await getDriversByOwner(ownerId, 1, 1);
    const fines = await getFinesByOwner(ownerId);
    const ownerRecord = await getOwnerById(ownerId);

    const pendingFines = fines.filter(f => f.status === 'pending');
    const pendingAmount = pendingFines.reduce((sum, f) => sum + f.amount, 0);

    return {
      success: true,
      data: {
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'active').length,
        totalDrivers: driversResult.total,
        activeDrivers: driversResult.documents.filter(d => d.status === 'active').length,
        pendingFines: pendingFines.length,
        totalFinesAmount: pendingAmount,
        membershipStatus: ownerRecord?.membershipStatus || 'pending',
      },
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

// ==================== ANNOUNCEMENTS ====================

export async function getOwnerAnnouncementsAction(tenantId: string, page = 1, limit = 25) {
  await getOwnerSession(tenantId);
  try {
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    const offset = (page - 1) * limit;

    const response = await databases.listDocuments(databaseId, COLLECTIONS.NOTIFICATIONS, [
      Query.equal('tenantId', tenantId),
      Query.isNull('userId'),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]);

    return {
      success: true,
      data: {
        documents: response.documents,
        total: response.total,
        page,
        limit,
        hasMore: offset + response.documents.length < response.total,
      },
    };
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return { success: false, error: 'Failed to fetch announcements' };
  }
}

function getVehicleByPermit(tenantId: string, operatingPermitNumber: string) {
  throw new Error('Function not implemented.');
}
