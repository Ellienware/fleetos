import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { Route, RouteFormData, RouteStatus, RouteAssignment, AssignmentStatus, PaginatedResponse } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

// Helper to parse stops if stored as JSON string
function parseStops(stops: any): any[] {
  if (!stops) return [];
  if (Array.isArray(stops)) return stops;
  if (typeof stops === 'string') {
    try { return JSON.parse(stops); } catch { return []; }
  }
  return [];
}

// Route Operations
export async function createRoute(
  tenantId: string,
  data: RouteFormData
): Promise<Route> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  // Ensure stops is stored as JSON string
  const stopsJson = data.stops ? JSON.stringify(data.stops) : '[]';
  
  return databases.createDocument(
    databaseId,
    COLLECTIONS.ROUTES,
    ID.unique(),
    {
      tenantId,
      name: data.name,
      code: data.code.toUpperCase(),
      origin: data.origin,
      destination: data.destination,
      originLat: data.originLat,
      originLng: data.originLng,
      destinationLat: data.destinationLat,
      destinationLng: data.destinationLng,
      distance: data.distance,
      baseFare: data.baseFare,
      maxVehicles: data.maxVehicles,
      currentVehicleCount: 0,
      status: 'active' as RouteStatus,
      stops: stopsJson,
      polyline: data.polyline || '', // polyline generated before calling this
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as Route;
}

export async function getRouteById(routeId: string): Promise<Route | null> {
  const { databases } = createAdminClient();
  try {
    const doc = await databases.getDocument(
      databaseId,
      COLLECTIONS.ROUTES,
      routeId
    ) as any;
    
    // Parse stops JSON if stored as string
    if (doc.stops && typeof doc.stops === 'string') {
      doc.stops = JSON.parse(doc.stops);
    } else if (!doc.stops) {
      doc.stops = [];
    }
    
    return doc as unknown as Route;
  } catch {
    return null;
  }
}

export async function getRoutesByTenant(
  tenantId: string,
  page = 1,
  limit = 25,
  status?: RouteStatus
): Promise<PaginatedResponse<Route>> {
  const { databases } = createAdminClient();
  const offset = (page - 1) * limit;
  const queries = [Query.equal('tenantId', tenantId), Query.orderDesc('createdAt')];
  
  if (status) {
    queries.push(Query.equal('status', status));
  }
  
  queries.push(Query.limit(limit), Query.offset(offset));
  
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTES,
    queries
  );
  
  // Parse stops for each route
  const documents = (response.documents as any[]).map(doc => ({
    ...doc,
    stops: parseStops(doc.stops),
  })) as unknown as Route[];
  
  return {
    documents,
    total: response.total,
    page,
    limit,
    hasMore: offset + response.documents.length < response.total,
  };
}

export async function getAllRoutesByTenant(tenantId: string): Promise<Route[]> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.ROUTES,
    [
      Query.equal('tenantId', tenantId),
      Query.equal('status', 'active'),
      Query.orderAsc('name'),
    ]
  );
  
  return (response.documents as any[]).map(doc => ({
    ...doc,
    stops: parseStops(doc.stops),
  })) as unknown as Route[];
}

export async function updateRoute(
  routeId: string,
  data: Partial<RouteFormData & { status: RouteStatus; currentVehicleCount: number; polyline?: string }>
): Promise<Route> {
  const { databases } = createAdminClient();
  
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  if (data.code) {
    updateData.code = data.code.toUpperCase();
  }
  
  // If stops is provided, stringify it
  if (data.stops) {
    updateData.stops = JSON.stringify(data.stops);
  }
  
  // Ensure lat/lng are numbers (they come as numbers from form)
  if (data.originLat !== undefined) updateData.originLat = data.originLat;
  if (data.originLng !== undefined) updateData.originLng = data.originLng;
  if (data.destinationLat !== undefined) updateData.destinationLat = data.destinationLat;
  if (data.destinationLng !== undefined) updateData.destinationLng = data.destinationLng;
  
  const updated = await databases.updateDocument(
    databaseId,
    COLLECTIONS.ROUTES,
    routeId,
    updateData
  ) as any;
  
  // Parse stops for return
  if (updated.stops && typeof updated.stops === 'string') {
    updated.stops = JSON.parse(updated.stops);
  }
  
  return updated as unknown as Route;
}

export async function deleteRoute(routeId: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(databaseId, COLLECTIONS.ROUTES, routeId);
}

// Route Assignment Operations
export async function createRouteAssignment(
  tenantId: string,
  routeId: string,
  vehicleId: string,
  ownerId: string
): Promise<RouteAssignment> {
  const { databases } = createAdminClient();
  
  const now = new Date().toISOString();
  
  // Create assignment
  const assignment = await databases.createDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    ID.unique(),
    {
      tenantId,
      routeId,
      vehicleId,
      ownerId,
      status: 'active' as AssignmentStatus,
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
    }
  ) as unknown as RouteAssignment;
  
  // Update route vehicle count
  const route = await getRouteById(routeId);
  if (route) {
    await updateRoute(routeId, {
      currentVehicleCount: route.currentVehicleCount + 1,
    });
  }
  
  return assignment;
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

export async function revokeRouteAssignment(assignmentId: string): Promise<RouteAssignment> {
  const { databases } = createAdminClient();
  
  const assignment = await databases.getDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    assignmentId
  ) as unknown as RouteAssignment;
  
  // Update assignment status
  const updatedAssignment = await databases.updateDocument(
    databaseId,
    COLLECTIONS.ROUTE_ASSIGNMENTS,
    assignmentId,
    {
      status: 'revoked' as AssignmentStatus,
      updatedAt: new Date().toISOString(),
    }
  ) as unknown as RouteAssignment;
  
  // Update route vehicle count
  const route = await getRouteById(assignment.routeId);
  if (route && route.currentVehicleCount > 0) {
    await updateRoute(assignment.routeId, {
      currentVehicleCount: route.currentVehicleCount - 1,
    });
  }
  
  return updatedAssignment;
}
