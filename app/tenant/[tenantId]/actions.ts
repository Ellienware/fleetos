'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/session';
import { 
  createOwner, 
  getOwnersByTenant, 
  getOwnerById, 
  updateOwner, 
  deleteOwner,
  getOwnerStats 
} from '@/lib/appwrite/collections/owners';
import { 
  createVehicle, 
  getVehiclesByTenant, 
  getVehicleById, 
  updateVehicle, 
  deleteVehicle,
  getVehiclesByOwner 
} from '@/lib/appwrite/collections/vehicles';
import { 
  createRoute, 
  getRoutesByTenant, 
  getRouteById, 
  updateRoute, 
  deleteRoute, 
  getRouteAssignmentsByRoute
} from '@/lib/appwrite/collections/routes';
import { 
  createFine, 
  getFinesByTenant, 
  getFinesByOwner, 
  markFinePaid, 
  waiveFine, 
  deleteFine
} from '@/lib/appwrite/collections/fines';
import { 
  createPayment, 
  getPaymentsByTenant, 
  getPaymentsByOwner, 
  createManualPayment
} from '@/lib/appwrite/collections/payments';
import { getTenantById } from '@/lib/appwrite/collections/tenants';
import {
  createBroadcastNotification,
  getNotificationsByUser,
  deleteNotification,
  getNotificationById,
  updateNotification,
} from '@/lib/appwrite/collections/notifications';
import { createAdminClient, ID, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import type { 
  OwnerFormData, 
  VehicleFormData, 
  RouteFormData, 
  FineFormData,
  MembershipStatus,
  VehicleStatus,
  RouteStatus,
  RankFormData,
  RankRoute
} from '@/types';
import { createRouteAssignment, deleteRouteAssignment, getAllRouteAssignments, getRouteAssignmentById, revokeRouteAssignment, updateRouteAssignment } from '@/lib/appwrite/collections/routeAssignment';
import { assignRouteToRank, createRank, deleteRank, getRankRoutes, removeRouteFromRank, updateRank } from '@/lib/appwrite/collections/ranks';
import { toRoute } from '@/lib/mappers/route.mapper';

// Add at the top of actions.ts
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Helper to validate tenant access
async function validateTenantAccess(tenantId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  // Super admin can access any tenant
  if (session.role === 'SUPER_ADMIN') {
    return session;
  }
  
  // Association admin can only access their own tenant
  if (session.tenantId !== tenantId) {
    throw new Error('Access denied');
  }
  
  return session;
}

// ==================== OWNER ACTIONS ====================



/**
 * Helper: Format phone to E.164 or return undefined (Appwrite wants undefined, not null)
 */
function formatPhoneNumber(phone: string | undefined | null): string | undefined {
  if (!phone || phone.trim() === '') return undefined;
  
  const raw = phone.trim();
  // Remove all non‑digit except leading '+'
  const cleaned = raw.replace(/[^\d+]/g, '');
  let withPlus = cleaned;
  if (!cleaned.startsWith('+')) {
    withPlus = `+${cleaned}`;
  }
  const digitsOnly = withPlus.slice(1).replace(/\D/g, '');
  if (digitsOnly.length === 0 || digitsOnly.length > 15) {
    return undefined; // invalid → treat as missing
  }
  return `+${digitsOnly}`;
}

export async function createOwnerAction(tenantId: string, data: OwnerFormData) {
  const session = await validateTenantAccess(tenantId);
  if (!session) {
    return { success: false, error: 'Unauthorized access' };
  }
  
  try {
    // 1. Format phone to E.164 (or undefined if invalid/missing)
    const formattedPhone = formatPhoneNumber(data.phone);
    if (data.phone && data.phone.trim() !== '' && !formattedPhone) {
      return { 
        success: false, 
        error: 'Invalid phone number. Must start with "+" and have 1–15 digits (e.g., +27721234567).' 
      };
    }
    
    // 2. Create Appwrite user (undefined is allowed, null is not)
    const { users } = createAdminClient();
    const tempPassword = Math.random().toString(36).slice(-12);
    const newUser = await users.create(
      ID.unique(),
      data.email,
      formattedPhone,        // ✅ undefined (not null) when no phone
      tempPassword,
      `${data.firstName} ${data.lastName}`
    );
    
    // 3. Create owner document
    //    If your CreateOwnerData requires a string, we can pass an empty string or modify the type.
    //    Here we assume the type can accept `string | undefined` – if not, adjust accordingly.
    const owner = await createOwner(tenantId, {
      ...data,
      userId: newUser.$id,
      profileId: newUser.$id,
      membershipStatus: 'pending',
      phone: formattedPhone ?? '',   // fallback to empty string if undefined
    });
    
    revalidatePath(`/tenant/${tenantId}/owners`, 'page');
    return { success: true, data: toPlainObject(owner) };
    
  } catch (error: any) {
    console.error('Failed to create owner:', error);
    if (error?.code === 400 && error?.type === 'general_argument_invalid' && error?.response?.includes('phone')) {
      return { success: false, error: 'Invalid phone number format. Use international format starting with + (e.g., +27721234567).' };
    }
    return { success: false, error: error?.message || 'Failed to create owner' };
  }
}


// Then inside getOwnersAction:
export async function getOwnersAction(tenantId: string, page = 1, limit = 25, status?: MembershipStatus) {
  await validateTenantAccess(tenantId);
  try {
    // Pass status inside an object (filters)
    const result = await getOwnersByTenant(tenantId, page, limit, { status });
    return {
      success: true,
      data: {
        documents: toPlainObject(result.documents),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      }
    };
  } catch (error) {
    console.error('Failed to fetch owners:', error);
    return { success: false, error: 'Failed to fetch owners' };
  }
}

export async function getOwnerAction(ownerId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const owner = await getOwnerById(ownerId);
    if (!owner) return { success: false, error: 'Owner not found' };
    if (session.role !== 'SUPER_ADMIN' && session.tenantId !== owner.tenantId) {
      return { success: false, error: 'Access denied' };
    }
    return { success: true, data: toPlainObject(owner) };
  } catch (error) {
    console.error('Failed to fetch owner:', error);
    return { success: false, error: 'Failed to fetch owner' };
  }
}

export async function updateOwnerAction(
  tenantId: string,
  ownerId: string,
  data: Partial<OwnerFormData & { membershipStatus: MembershipStatus }>
) {
  await validateTenantAccess(tenantId);
  try {
    const owner = await updateOwner(ownerId, data);
    revalidatePath(`/tenant/${tenantId}/owners`, 'page');
    revalidatePath(`/tenant/${tenantId}/owners/${ownerId}`, 'page');
    return { success: true, data: toPlainObject(owner) };
  } catch (error) {
    console.error('Failed to update owner:', error);
    return { success: false, error: 'Failed to update owner' };
  }
}

export async function deleteOwnerAction(tenantId: string, ownerId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    await deleteOwner(ownerId);
    revalidatePath(`/tenant/${tenantId}/owners`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete owner:', error);
    return { success: false, error: 'Failed to delete owner' };
  }
}

export async function getOwnerStatsAction(tenantId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    const stats = await getOwnerStats(tenantId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to fetch owner stats:', error);
    return { success: false, error: 'Failed to fetch owner stats' };
  }
}

// ==================== VEHICLE ACTIONS ====================

export async function createVehicleAction(tenantId: string, data: VehicleFormData) {
  await validateTenantAccess(tenantId);
  
  try {
    const vehicle = await createVehicle(tenantId, data);
    revalidatePath(`/tenant/${tenantId}/vehicles`, 'page');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Failed to create vehicle:', error);
    return { success: false, error: 'Failed to create vehicle' };
  }
}


export async function getVehiclesAction(tenantId: string, page = 1, limit = 25, status?: VehicleStatus) {
  await validateTenantAccess(tenantId);
  try {
    const result = await getVehiclesByTenant(tenantId, page, limit, status);
    return {
      success: true,
      data: {
        documents: toPlainObject(result.documents),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      }
    };
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    return { success: false, error: 'Failed to fetch vehicles' };
  }
}

export async function getVehicleAction(vehicleId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  try {
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found' };
    }
    
    if (session.role !== 'SUPER_ADMIN' && session.tenantId !== vehicle.tenantId) {
      return { success: false, error: 'Access denied' };
    }
    
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Failed to fetch vehicle:', error);
    return { success: false, error: 'Failed to fetch vehicle' };
  }
}

export async function getVehiclesByOwnerAction(ownerId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const vehicles = await getVehiclesByOwner(ownerId);
    return { success: true, data: toPlainObject(vehicles) };
  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    return { success: false, error: 'Failed to fetch vehicles' };
  }
}

export async function updateVehicleAction(
  tenantId: string, 
  vehicleId: string, 
  data: Partial<VehicleFormData & { status: VehicleStatus }>
) {
  await validateTenantAccess(tenantId);
  
  try {
    const vehicle = await updateVehicle(vehicleId, data);
    revalidatePath(`/tenant/${tenantId}/vehicles`, 'page');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Failed to update vehicle:', error);
    return { success: false, error: 'Failed to update vehicle' };
  }
}

export async function deleteVehicleAction(tenantId: string, vehicleId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    await deleteVehicle(vehicleId);
    revalidatePath(`/tenant/${tenantId}/vehicles`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete vehicle:', error);
    return { success: false, error: 'Failed to delete vehicle' };
  }
}

export async function approveVehicleAction(tenantId: string, vehicleId: string) {
  const session = await validateTenantAccess(tenantId);
  try {
    const vehicle = await updateVehicle(vehicleId, { status: 'active' });
    revalidatePath(`/tenant/${tenantId}/vehicles`, 'page');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Failed to approve vehicle:', error);
    return { success: false, error: 'Failed to approve vehicle' };
  }
}

export async function rejectVehicleAction(tenantId: string, vehicleId: string, reason?: string) {
  await validateTenantAccess(tenantId);
  
  try {
    // Delete the vehicle when rejected
    await deleteVehicle(vehicleId);
    revalidatePath(`/tenant/${tenantId}/vehicles`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to reject vehicle:', error);
    return { success: false, error: 'Failed to reject vehicle' };
  }
}


// ==================== ROUTE ACTIONS ====================

// ==================== ROUTE ACTIONS ====================

import { generatePolylineWithGoogle } from '@/lib/google-maps';

export async function createRouteAction(tenantId: string, data: RouteFormData) {
  await validateTenantAccess(tenantId);
  try {
    // Build waypoints: origin -> stops -> destination
    const waypoints = [
      { lat: data.originLat, lng: data.originLng },
      ...data.stops.map(s => ({ lat: s.lat, lng: s.lng })),
      { lat: data.destinationLat, lng: data.destinationLng },
    ];
    
    let polyline = '';
    let distance = data.distance; // default to user input
    
    if (waypoints.length >= 2) {
      try {
        const result = await generatePolylineWithGoogle(waypoints);
        polyline = result.polyline;
        distance = result.distance;
      } catch (err) {
        console.warn('Polyline generation failed, using user-provided distance:', err);
        // Continue without polyline if API fails
      }
    }
    
    const routeData = {
      ...data,
      distance,
      polyline,
      stops: data.stops, // will be stringified in createRoute
    };
    
    const route = await createRoute(tenantId, routeData);
    revalidatePath(`/tenant/${tenantId}/routes`, 'page');
    return { success: true, data: toPlainObject(route) };
  } catch (error) {
    console.error('Failed to create route:', error);
    return { success: false, error: 'Failed to create route' };
  }
}

export async function updateRouteAction(
  tenantId: string,
  routeId: string,
  data: Partial<RouteFormData & { status: RouteStatus }>
) {
  await validateTenantAccess(tenantId);
  try {
    const updatePayload: any = { ...data };
    
    // If any location-related field changed, regenerate polyline
    const needsPolyline = data.originLat !== undefined || data.originLng !== undefined ||
                          data.destinationLat !== undefined || data.destinationLng !== undefined ||
                          data.stops !== undefined;
    
    if (needsPolyline) {
      // Fetch current route to get missing data
      const current = await getRouteById(routeId);
      if (current) {
        const waypoints = [
          { lat: data.originLat ?? current.originLat, lng: data.originLng ?? current.originLng },
          ...(data.stops ?? current.stops).map(s => ({ lat: s.lat, lng: s.lng })),
          { lat: data.destinationLat ?? current.destinationLat, lng: data.destinationLng ?? current.destinationLng },
        ];
        
        if (waypoints.length >= 2) {
          try {
            const { polyline, distance } = await generatePolylineWithGoogle(waypoints);
            updatePayload.polyline = polyline;
            updatePayload.distance = distance;
          } catch (err) {
            console.warn('Polyline regeneration failed:', err);
          }
        }
      }
    }
    
    const route = await updateRoute(routeId, updatePayload);
    revalidatePath(`/tenant/${tenantId}/routes`, 'page');
    return { success: true, data: toPlainObject(route) };
  } catch (error) {
    console.error('Failed to update route:', error);
    return { success: false, error: 'Failed to update route' };
  }
}

export async function getRoutesAction(tenantId: string, page = 1, limit = 25, status?: RouteStatus) {
  await validateTenantAccess(tenantId);
  try {
    const result = await getRoutesByTenant(tenantId, page, limit, status);
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
    console.error('Failed to fetch routes:', error);
    return { success: false, error: 'Failed to fetch routes' };
  }
}

export async function getRouteAction(routeId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const route = await getRouteById(routeId);
    if (!route) return { success: false, error: 'Route not found' };
    if (session.role !== 'SUPER_ADMIN' && session.tenantId !== route.tenantId)
      return { success: false, error: 'Access denied' };
    return { success: true, data: toPlainObject(route) };
  } catch (error) {
    console.error('Failed to fetch route:', error);
    return { success: false, error: 'Failed to fetch route' };
  }
}


export async function deleteRouteAction(tenantId: string, routeId: string) {
  await validateTenantAccess(tenantId);
  try {
    await deleteRoute(routeId);
    revalidatePath(`/tenant/${tenantId}/routes`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete route:', error);
    return { success: false, error: 'Failed to delete route' };
  }
}

// ==================== ROUTE ASSIGNMENT ACTIONS ====================

export async function getAllRouteAssignmentsAction(tenantId: string) {
  await validateTenantAccess(tenantId);
  try {
    const assignments = await getAllRouteAssignments(tenantId);
    return { success: true, data: toPlainObject(assignments) };
  } catch (error) {
    console.error('Failed to fetch route assignments:', error);
    return { success: false, error: 'Failed to fetch assignments' };
  }
}

export async function createRouteAssignmentAction(
  tenantId: string,
  data: { routeId: string; vehicleId: string; ownerId: string }
) {
  await validateTenantAccess(tenantId);
  try {
    const assignment = await createRouteAssignment(tenantId, data);
    revalidatePath(`/tenant/${tenantId}/assignments`);
    revalidatePath(`/tenant/${tenantId}/routes/${data.routeId}`);
    return { success: true, data: toPlainObject(assignment) };
  } catch (error) {
    console.error('Failed to create route assignment:', error);
    return { success: false, error: 'Failed to assign vehicle to route' };
  }
}

export async function updateRouteAssignmentAction(
  tenantId: string,
  assignmentId: string,
  data: { routeId: string; vehicleId: string; ownerId: string }
) {
  await validateTenantAccess(tenantId);
  try {
    const assignment = await updateRouteAssignment(assignmentId, data);
    revalidatePath(`/tenant/${tenantId}/assignments`);
    revalidatePath(`/tenant/${tenantId}/routes/${data.routeId}`);
    // Also revalidate old route if it changed (the updateRouteAssignment function handles count, but we need to revalidate the old route)
    const oldAssignment = await getRouteAssignmentById(assignmentId);
    if (oldAssignment && oldAssignment.routeId !== data.routeId) {
      revalidatePath(`/tenant/${tenantId}/routes/${oldAssignment.routeId}`);
    }
    return { success: true, data: toPlainObject(assignment) };
  } catch (error) {
    console.error('Failed to update route assignment:', error);
    return { success: false, error: 'Failed to update assignment' };
  }
}

export async function revokeRouteAssignmentAction(
  tenantId: string,
  assignmentId: string,
  routeId: string
) {
  await validateTenantAccess(tenantId);
  try {
    await revokeRouteAssignment(assignmentId);
    revalidatePath(`/tenant/${tenantId}/assignments`);
    revalidatePath(`/tenant/${tenantId}/routes/${routeId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke route assignment:', error);
    return { success: false, error: 'Failed to revoke assignment' };
  }
}

export async function deleteRouteAssignmentAction(tenantId: string, assignmentId: string) {
  await validateTenantAccess(tenantId);
  try {
    await deleteRouteAssignment(assignmentId);
    revalidatePath(`/tenant/${tenantId}/assignments`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete route assignment:', error);
    return { success: false, error: 'Failed to delete assignment' };
  }
}
// ==================== FINE ACTIONS ====================

export async function createFineAction(tenantId: string, data: FineFormData) {
  const session = await validateTenantAccess(tenantId);
  
  try {
    const fine = await createFine(tenantId, session.userId, data);
    revalidatePath(`/tenant/${tenantId}/fines`, 'page');
    return { success: true, data: fine };
  } catch (error) {
    console.error('Failed to create fine:', error);
    return { success: false, error: 'Failed to create fine' };
  }
}

export async function getFinesAction(tenantId: string, page = 1, limit = 25, status?: 'pending' | 'paid' | 'waived') {
  await validateTenantAccess(tenantId);
  
  try {
    const result = await getFinesByTenant(tenantId, page, limit, status);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to fetch fines:', error);
    return { success: false, error: 'Failed to fetch fines' };
  }
}

export async function getFinesByOwnerAction(ownerId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const fines = await getFinesByOwner(ownerId);
    return { success: true, data: toPlainObject(fines) };
  } catch (error) {
    console.error('Failed to fetch fines:', error);
    return { success: false, error: 'Failed to fetch fines' };
  }
}

export async function markFinePaidAction(tenantId: string, fineId: string, paymentId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    const fine = await markFinePaid(fineId, paymentId);
    revalidatePath(`/tenant/${tenantId}/fines`, 'page');
    return { success: true, data: fine };
  } catch (error) {
    console.error('Failed to mark fine as paid:', error);
    return { success: false, error: 'Failed to mark fine as paid' };
  }
}

export async function waiveFineAction(tenantId: string, fineId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    const fine = await waiveFine(fineId);
    revalidatePath(`/tenant/${tenantId}/fines`, 'page');
    return { success: true, data: fine };
  } catch (error) {
    console.error('Failed to waive fine:', error);
    return { success: false, error: 'Failed to waive fine' };
  }
}

// ==================== PAYMENT ACTIONS ====================

export async function createPaymentAction(
  tenantId: string,
  data: {
    ownerId: string;
    amount: number;
    period: string;
  }
) {
  await validateTenantAccess(tenantId);
  try {
    const payment = await createManualPayment({
      tenantId,
      ownerId: data.ownerId,
      amount: data.amount,
      period: data.period,
    });

    // Add UI-friendly fields
    const enhancedPayment = {
      ...payment,
      description: `Membership fee - ${data.period}`,
      transactionReference: payment.paystackReference,
    };

    revalidatePath(`/tenant/${tenantId}/membership`);
    return { success: true, data: toPlainObject(enhancedPayment) };
  } catch (error) {
    console.error('Failed to create payment:', error);
    return { success: false, error: 'Failed to record payment' };
  }
}

// Update getPaymentsAction
export async function getPaymentsAction(tenantId: string, page = 1, limit = 25) {
  await validateTenantAccess(tenantId);
  try {
    const result = await getPaymentsByTenant(tenantId, page, limit);
    const transformed = result.documents.map((payment: any) => ({
      ...payment,
      description: `Membership fee - ${payment.period || ''}`,
      transactionReference: payment.paystackReference || payment.paystackTransactionId,
    }));
    return {
      success: true,
      data: {
        documents: toPlainObject(transformed),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      }
    };
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return { success: false, error: 'Failed to fetch payments' };
  }
}

export async function getPaymentsByOwnerAction(ownerId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const payments = await getPaymentsByOwner(ownerId);
    return { success: true, data: toPlainObject(payments) };
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return { success: false, error: 'Failed to fetch payments' };
  }
}

export async function sendPaymentReminderAction(tenantId: string, paymentId: string, ownerId: string) {
  await validateTenantAccess(tenantId);
  try {
    // TODO: integrate actual email/SMS sending
    console.log(`Sending reminder for payment ${paymentId} to owner ${ownerId}`);
    return { success: true, message: 'Reminder sent' };
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return { success: false, error: 'Failed to send reminder' };
  }
}

export async function markPaymentAsPaidAction(tenantId: string, paymentId: string) {
  await validateTenantAccess(tenantId);
  try {
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    const now = new Date().toISOString();
    const updated = await databases.updateDocument(
      databaseId,
      COLLECTIONS.MEMBERSHIP_PAYMENTS,
      paymentId,
      {
        status: 'completed',
        paidAt: now,
        updatedAt: now,
      }
    );
    revalidatePath(`/tenant/${tenantId}/membership`);
    return { success: true, data: toPlainObject(updated) };
  } catch (error) {
    console.error('Failed to mark payment as paid:', error);
    return { success: false, error: 'Failed to update payment' };
  }
}
// ==================== TENANT/DASHBOARD ACTIONS ====================

export async function getTenantAction(tenantId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return { success: false, error: 'Tenant not found' };
    }
    return { success: true, data: tenant };
  } catch (error) {
    console.error('Failed to fetch tenant:', error);
    return { success: false, error: 'Failed to fetch tenant' };
  }
}

export async function getDashboardStatsAction(tenantId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    const [ownersResult, vehiclesResult, routesResult, finesResult] = await Promise.all([
      getOwnersByTenant(tenantId, 1, 1),
      getVehiclesByTenant(tenantId, 1, 1),
      getRoutesByTenant(tenantId, 1, 1),
      getFinesByTenant(tenantId, 1, 1, 'pending'),
    ]);
    
    return {
      success: true,
      data: {
        totalOwners: ownersResult.total,
        totalVehicles: vehiclesResult.total,
        totalRoutes: routesResult.total,
        pendingFines: finesResult.total,
      },
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

// ==================== ANNOUNCEMENT ACTIONS ====================

export async function getAnnouncementsAction(tenantId: string, page = 1, limit = 25) {
  await validateTenantAccess(tenantId);
  
  try {
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    
    const offset = (page - 1) * limit;
    
    // Get broadcast notifications (userId is null)
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.NOTIFICATIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.isNull('userId'),
        Query.orderDesc('createdAt'),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );
    
    // Get owner count for "sentTo" stat
    const ownersRes = await databases.listDocuments(
      databaseId,
      COLLECTIONS.OWNERS,
      [Query.equal('tenantId', tenantId), Query.limit(1)]
    );
    
    // Add stats to each announcement
    const announcementsWithStats = response.documents.map((doc: any) => ({
      ...doc,
      sentTo: ownersRes.total,
      readBy: Math.floor(Math.random() * ownersRes.total), // Would need tracking for actual reads
    }));
    
    return {
      success: true,
      data: {
        documents: announcementsWithStats,
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

export async function createAnnouncementAction(
  tenantId: string,
  data: {
    title: string;
    message: string;
    type: 'announcement' | 'compliance' | 'system' | 'payment';
    priority: 'low' | 'medium' | 'high';
  }
) {
  await validateTenantAccess(tenantId);
  
  try {
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    
    const notification = await databases.createDocument(
      databaseId,
      COLLECTIONS.NOTIFICATIONS,
      require('appwrite').ID.unique(),
      {
        tenantId,
        userId: null, // Broadcast
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      }
    );
    
    revalidatePath(`/tenant/${tenantId}/announcements`, 'page');
    return { success: true, data: notification };
  } catch (error) {
    console.error('Failed to create announcement:', error);
    return { success: false, error: 'Failed to create announcement' };
  }
}

export async function deleteAnnouncementAction(tenantId: string, announcementId: string) {
  await validateTenantAccess(tenantId);
  
  try {
    await deleteNotification(announcementId);
    revalidatePath(`/tenant/${tenantId}/announcements`, 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return { success: false, error: 'Failed to delete announcement' };
  }
}

export async function getAnnouncementAction(announcementId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  try {
    const announcement = await getNotificationById(announcementId);
    if (!announcement) return { success: false, error: 'Announcement not found' };
    if (session.role !== 'SUPER_ADMIN' && session.tenantId !== announcement.tenantId) {
      return { success: false, error: 'Access denied' };
    }
    return { success: true, data: toPlainObject(announcement) };
  } catch (error) {
    console.error('Failed to fetch announcement:', error);
    return { success: false, error: 'Failed to fetch announcement' };
  }
}

export async function updateAnnouncementAction(
  tenantId: string,
  announcementId: string,
  data: { title: string; message: string; type: 'announcement' | 'compliance' | 'system' | 'payment'; priority: 'low' | 'medium' | 'high' }
) {
  await validateTenantAccess(tenantId);
  try {
    const updated = await updateNotification(announcementId, data);
    revalidatePath(`/tenant/${tenantId}/announcements`);
    revalidatePath(`/tenant/${tenantId}/announcements/${announcementId}/edit`);
    return { success: true, data: toPlainObject(updated) };
  } catch (error) {
    console.error('Failed to update announcement:', error);
    return { success: false, error: 'Failed to update announcement' };
  }
}

// ==================== RANK ACTIONS ====================

export async function createRankAction(tenantId: string, data: RankFormData) {
  await validateTenantAccess(tenantId);
  try {
    const rank = await createRank(tenantId, data);
    revalidatePath(`/tenant/${tenantId}/ranks`);
    return { success: true, data: toPlainObject(rank) };
  } catch (error) {
    console.error('Failed to create rank:', error);
    return { success: false, error: 'Failed to create rank' };
  }
}


export async function deleteRankAction(tenantId: string, rankId: string) {
  await validateTenantAccess(tenantId);
  try {
    await deleteRank(rankId);
    revalidatePath(`/tenant/${tenantId}/ranks`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete rank:', error);
    return { success: false, error: 'Failed to delete rank' };
  }
}

export async function assignRouteToRankAction(tenantId: string, rankId: string, routeId: string) {
  await validateTenantAccess(tenantId);
  try {
    await assignRouteToRank(rankId, routeId);
    revalidatePath(`/tenant/${tenantId}/ranks/${rankId}/routes`);
    return { success: true };
  } catch (error) {
    console.error('Failed to assign route:', error);
    return { success: false, error: 'Failed to assign route' };
  }
}

export async function removeRouteFromRankAction(tenantId: string, rankId: string, routeId: string) {
  await validateTenantAccess(tenantId);
  try {
    await removeRouteFromRank(rankId, routeId);
    revalidatePath(`/tenant/${tenantId}/ranks/${rankId}/routes`);
    return { success: true };
  } catch (error) {
    console.error('Failed to remove route:', error);
    return { success: false, error: 'Failed to remove route' };
  }
}


export async function getRankRoutesAction(tenantId: string, rankId: string) {
  await validateTenantAccess(tenantId);

  try {
    const { databases } = createAdminClient();

    const allRoutesRes = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.ROUTES,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('status', 'ACTIVE'), // ✅ FIXED casing
      ]
    );

    const assigned = await getRankRoutes(rankId);
    const assignedIds = assigned.map(r => r.routeId);

    return {
      success: true,
      data: {
        allRoutes: allRoutesRes.documents.map(toRoute),
        assignedRouteIds: assignedIds,
      },
    };
  } catch (error) {
    console.error('Failed to fetch rank routes:', error);
    return { success: false, error: 'Failed to fetch rank routes' };
  }
}

export async function deleteFineAction(
  tenantId: string,
  fineId: string
) {
  await validateTenantAccess(tenantId);

  try {
    await deleteFine(fineId);

    revalidatePath(`/tenant/${tenantId}/fines`, 'page');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete fine:', error);

    return {
      success: false,
      error: 'Failed to delete fine',
    };
  }
}
export async function updateRankAction(
  tenantId: string,
  rankId: string,
  data: Partial<RankFormData & { isActive?: boolean }>
) {
  await validateTenantAccess(tenantId);
  try {
    const rank = await updateRank(rankId, data);
    revalidatePath(`/tenant/${tenantId}/ranks`);
    revalidatePath(`/tenant/${tenantId}/ranks/${rankId}`);
    return { success: true, data: toPlainObject(rank) };
  } catch (error) {
    console.error('Failed to update rank:', error);
    return { success: false, error: 'Failed to update rank' };
  }
}

