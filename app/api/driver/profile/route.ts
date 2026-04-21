import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { getDriverById } from '@/lib/appwrite/collections/drivers';
import { getActiveAssignmentForDriver } from '@/lib/appwrite/collections/driver-assignments';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';
import { getOwnerById } from '@/lib/appwrite/collections/owners';
import { getTenantById } from '@/lib/appwrite/collections/tenants';

export async function GET(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get full driver details
    const driver = await getDriverById(session.driverId);
    
    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }
    
    // Get assignment, vehicle, owner, and tenant details
    const [assignment, owner, tenant] = await Promise.all([
      getActiveAssignmentForDriver(session.driverId),
      getOwnerById(session.ownerId),
      getTenantById(session.tenantId),
    ]);
    
    let vehicle = null;
    if (assignment) {
      vehicle = await getVehicleById(assignment.vehicleId);
    }
    
    // Return in the format expected by the driver app
    return NextResponse.json({
      success: true,
      driver: {
        $id: driver.$id,
        driverId: driver.$id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        idNumber: driver.idNumber,
        phone: driver.phone,
        email: driver.email,
        prdpNumber: driver.prdpNumber,
        prdpExpiry: driver.prdpExpiry,
        driverLicenseNumber: driver.driverLicenseNumber,
        driverLicenseExpiry: driver.driverLicenseExpiry,
        driverLicenseCode: driver.driverLicenseCode,
        status: driver.status,
        profilePhotoId: driver.profilePhotoId,
        tenantId: session.tenantId,
        ownerId: session.ownerId,
        tenantName: tenant?.name || 'Association',
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        vehicleId: vehicle?.$id || null,
        vehicleRegistration: vehicle?.registrationNumber || null,
      },
    });
  } catch (error) {
    console.error('Error getting driver profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}
