import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { RouteAssignment, AssignmentStatus } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createRouteAssignment(
  tenantId: string,
  data: {
    routeId: string;
    vehicleId: string;
    ownerId: string;
  }
): Promise<RouteAssignment> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  const assignment = await databases.createDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    ID.unique(),
    {
      tenantId,
      routeId: data.routeId,
      vehicleId: data.vehicleId,
      ownerId: data.ownerId,
      status: 'active' as AssignmentStatus,
      assignedAt: now,

    }
  ) as unknown as RouteAssignment;

  // Update route vehicle count
  const { databases: adminDb } = createAdminClient();
  const route = await adminDb.getDocument(databaseId, COLLECTIONS.ROUTES, data.routeId);
  if (route) {
    await adminDb.updateDocument(databaseId, COLLECTIONS.ROUTES, data.routeId, {
      currentVehicleCount: (route.currentVehicleCount || 0) + 1,
      updatedAt: now,
    });
  }

  return assignment;
}

export async function getRouteAssignmentById(assignmentId: string): Promise<RouteAssignment | null> {
  const { databases } = createAdminClient();
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.ROUTE_ASSIGNMENTS,
      assignmentId
    ) as unknown as RouteAssignment;
  } catch {
    return null;
  }
}

export async function getAllRouteAssignments(tenantId: string): Promise<RouteAssignment[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    [
      Query.equal('tenantId', tenantId),
      Query.orderDesc('assignedAt'),
    ]
  );
  return response.documents as unknown as RouteAssignment[];
}

export async function getRouteAssignmentsByRoute(routeId: string): Promise<RouteAssignment[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    [
      Query.equal('routeId', routeId),
      Query.equal('status', 'active'),
      Query.orderDesc('assignedAt'),
    ]
  );
  return response.documents as unknown as RouteAssignment[];
}

export async function getRouteAssignmentsByVehicle(vehicleId: string): Promise<RouteAssignment[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    [
      Query.equal('vehicleId', vehicleId),
      Query.equal('status', 'active'),
    ]
  );
  return response.documents as unknown as RouteAssignment[];
}

export async function getRouteAssignmentsByOwner(ownerId: string): Promise<RouteAssignment[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    [
      Query.equal('ownerId', ownerId),
      Query.equal('status', 'active'),
    ]
  );
  return response.documents as unknown as RouteAssignment[];
}

export async function updateRouteAssignment(
  assignmentId: string,
  data: Partial<{
    routeId: string;
    vehicleId: string;
    ownerId: string;
    status: AssignmentStatus;
  }>
): Promise<RouteAssignment> {
  const { databases } = createAdminClient();
  const oldAssignment = await getRouteAssignmentById(assignmentId);
  if (!oldAssignment) throw new Error('Assignment not found');

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const updated = await databases.updateDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    assignmentId,
    updateData
  ) as unknown as RouteAssignment;

  // Handle route vehicle count changes if routeId changed
  if (data.routeId && data.routeId !== oldAssignment.routeId) {
    const { databases: adminDb } = createAdminClient();
    // Decrement old route
    const oldRoute = await adminDb.getDocument(databaseId, COLLECTIONS.ROUTES, oldAssignment.routeId);
    if (oldRoute && oldRoute.currentVehicleCount > 0) {
      await adminDb.updateDocument(databaseId, COLLECTIONS.ROUTES, oldAssignment.routeId, {
        currentVehicleCount: oldRoute.currentVehicleCount - 1,
        updatedAt: new Date().toISOString(),
      });
    }
    // Increment new route
    const newRoute = await adminDb.getDocument(databaseId, COLLECTIONS.ROUTES, data.routeId);
    if (newRoute) {
      await adminDb.updateDocument(databaseId, COLLECTIONS.ROUTES, data.routeId, {
        currentVehicleCount: (newRoute.currentVehicleCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return updated;
}

export async function revokeRouteAssignment(assignmentId: string): Promise<RouteAssignment> {
  const { databases } = createAdminClient();
  const assignment = await getRouteAssignmentById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');

  const updated = await databases.updateDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    assignmentId,
    {
      status: 'revoked' as AssignmentStatus,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as RouteAssignment;

  // Decrement route vehicle count
  const { databases: adminDb } = createAdminClient();
  const route = await adminDb.getDocument(databaseId, COLLECTIONS.ROUTES, assignment.routeId);
  if (route && route.currentVehicleCount > 0) {
    await adminDb.updateDocument(databaseId, COLLECTIONS.ROUTES, assignment.routeId, {
      currentVehicleCount: route.currentVehicleCount - 1,
      updatedAt: new Date().toISOString(),
    });
  }

  return updated;
}

export async function deleteRouteAssignment(assignmentId: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    assignmentId
  );
}