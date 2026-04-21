import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { getUpcomingShiftsForDriver, getShiftsByDriver } from '@/lib/appwrite/collections/shifts';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';
import { getRouteById } from '@/lib/appwrite/collections/routes';
import { getAttendanceByShift } from '@/lib/appwrite/collections/shift-attendances';

export async function GET(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'upcoming';
    
    let shifts;
    if (type === 'upcoming') {
      shifts = await getUpcomingShiftsForDriver(session.driverId, 10);
    } else {
      const page = parseInt(searchParams.get('page') || '1');
      const result = await getShiftsByDriver(session.driverId, page, 25);
      shifts = result.documents;
    }
    
    // Enrich shifts with vehicle and route details
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const [vehicle, route, attendance] = await Promise.all([
          getVehicleById(shift.vehicleId),
          shift.routeId ? getRouteById(shift.routeId) : null,
          getAttendanceByShift(shift.$id),
        ]);
        
        return {
          $id: shift.$id,
          scheduledStart: shift.scheduledStart,
          scheduledEnd: shift.scheduledEnd,
          actualStart: shift.actualStart,
          actualEnd: shift.actualEnd,
          status: shift.status,
          notes: shift.notes,
          vehicle: vehicle ? {
            $id: vehicle.$id,
            registrationNumber: vehicle.registrationNumber,
            make: vehicle.make,
            model: vehicle.model,
          } : null,
          route: route ? {
            $id: route.$id,
            name: route.name,
            code: route.code,
            origin: route.origin,
            destination: route.destination,
          } : null,
          attendance: attendance ? {
            clockInTime: attendance.clockInTime,
            clockOutTime: attendance.clockOutTime,
            status: attendance.status,
          } : null,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: enrichedShifts,
    });
  } catch (error) {
    console.error('Error getting driver shifts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get shifts' },
      { status: 500 }
    );
  }
}
