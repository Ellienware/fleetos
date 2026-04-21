import { createAdminClient, ID, Query } from '../server';
import { APPWRITE_CONFIG, COLLECTIONS } from '../config';
import type { DriverAssignment, DriverAssignmentStatus } from '@/types';

const { databaseId } = APPWRITE_CONFIG;

export async function createDriverAssignment(
  tenantId: string,
  data: {
    driverId: string;
    vehicleId: string;
    ownerId: string;
    isPrimary?: boolean;
  }
): Promise<DriverAssignment> {
  const { databases } = createAdminClient();
  const now = new Date().toISOString();

  if (data.isPrimary) {
    await unsetPrimaryAssignmentsForVehicle(data.vehicleId);
  }

  return databases.createDocument(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    ID.unique(),
    {
      tenantId,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      ownerId: data.ownerId,
      status: 'active' as DriverAssignmentStatus,
      isPrimary: data.isPrimary ?? false,
      startDate: now,
    }
  ) as unknown as DriverAssignment;
}

export async function getAssignmentById(
  assignmentId: string
): Promise<DriverAssignment | null> {
  const { databases } = createAdminClient();
  try {
    return await databases.getDocument(
      databaseId,
      COLLECTIONS.DRIVER_ASSIGNMENTS,
      assignmentId
    ) as unknown as DriverAssignment;
  } catch {
    return null;
  }
}

export async function getAssignmentsByDriver(
  driverId: string,
  status?: DriverAssignmentStatus
): Promise<DriverAssignment[]> {
  const { databases } = createAdminClient();
  const queries = [
    Query.equal('driverId', driverId),
    Query.orderDesc('$createdAt'),
  ];
  if (status) queries.push(Query.equal('status', status));
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    queries
  );
  return response.documents as unknown as DriverAssignment[];
}

export async function getAssignmentsByVehicle(
  vehicleId: string,
  status?: DriverAssignmentStatus
): Promise<DriverAssignment[]> {
  const { databases } = createAdminClient();
  const queries = [
    Query.equal('vehicleId', vehicleId),
    Query.orderDesc('$createdAt'),
  ];
  if (status) queries.push(Query.equal('status', status));
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    queries
  );
  return response.documents as unknown as DriverAssignment[];
}

export async function getAssignmentsByOwner(
  ownerId: string,
  status?: DriverAssignmentStatus
): Promise<DriverAssignment[]> {
  const { databases } = createAdminClient();
  const queries = [
    Query.equal('ownerId', ownerId),
    Query.orderDesc('$createdAt'),
  ];
  if (status) queries.push(Query.equal('status', status));
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    queries
  );
  return response.documents as unknown as DriverAssignment[];
}

export async function getActiveAssignmentForDriver(
  driverId: string
): Promise<DriverAssignment | null> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    [
      Query.equal('driverId', driverId),
      Query.equal('status', 'active'),
      Query.equal('isPrimary', true),
      Query.limit(1),
    ]
  );
  return response.documents[0] as unknown as DriverAssignment || null;
}

export async function getPrimaryDriverForVehicle(
  vehicleId: string
): Promise<DriverAssignment | null> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    [
      Query.equal('vehicleId', vehicleId),
      Query.equal('status', 'active'),
      Query.equal('isPrimary', true),
      Query.limit(1),
    ]
  );
  return response.documents[0] as unknown as DriverAssignment || null;
}

export async function updateAssignment(
  assignmentId: string,
  data: Partial<{
    status: DriverAssignmentStatus;
    isPrimary: boolean;
  }>
): Promise<DriverAssignment> {
  const { databases } = createAdminClient();
  
  if (data.isPrimary) {
    const assignment = await getAssignmentById(assignmentId);
    if (assignment) {
      await unsetPrimaryAssignmentsForVehicle(assignment.vehicleId, assignmentId);
    }
  }
  
  // Remove any `updatedAt` or `unassignedAt` if they accidentally appear
  const { updatedAt, unassignedAt, ...cleanData } = data as any;
  
  return databases.updateDocument(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    assignmentId,
    cleanData
  ) as unknown as DriverAssignment;
}

export async function deactivateAssignment(
  assignmentId: string
): Promise<DriverAssignment> {
  return updateAssignment(assignmentId, { status: 'inactive' });
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    assignmentId
  );
}

async function unsetPrimaryAssignmentsForVehicle(
  vehicleId: string,
  excludeAssignmentId?: string
): Promise<void> {
  const { databases } = createAdminClient();
  const queries = [
    Query.equal('vehicleId', vehicleId),
    Query.equal('isPrimary', true),
    Query.equal('status', 'active'),
  ];
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    queries
  );
  for (const doc of response.documents) {
    if (doc.$id !== excludeAssignmentId) {
      await databases.updateDocument(
        databaseId,
        COLLECTIONS.DRIVER_ASSIGNMENTS,
        doc.$id,
        { isPrimary: false }
      );
    }
  }
}

export async function checkExistingAssignment(
  driverId: string,
  vehicleId: string
): Promise<DriverAssignment | null> {
  const { databases } = createAdminClient();
  const response = await databases.listDocuments(
    databaseId,
    COLLECTIONS.DRIVER_ASSIGNMENTS,
    [
      Query.equal('driverId', driverId),
      Query.equal('vehicleId', vehicleId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  return response.documents[0] as unknown as DriverAssignment || null;
}