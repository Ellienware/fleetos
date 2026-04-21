import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { getShiftById, startShift, completeShift } from '@/lib/appwrite/collections/shifts';
import { 
  clockInForShift, 
  getAttendanceByShift,
  clockOut 
} from '@/lib/appwrite/collections/shift-attendances';

export async function POST(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { shiftId, action, latitude, longitude } = body;
    
    if (!shiftId || !action) {
      return NextResponse.json(
        { success: false, error: 'Shift ID and action are required' },
        { status: 400 }
      );
    }
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Valid GPS coordinates are required' },
        { status: 400 }
      );
    }
    
    // Verify the shift belongs to this driver
    const shift = await getShiftById(shiftId);
    
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      );
    }
    
    if (shift.driverId !== session.driverId) {
      return NextResponse.json(
        { success: false, error: 'This shift is not assigned to you' },
        { status: 403 }
      );
    }
    
    if (action === 'clock_in') {
      if (shift.status !== 'scheduled') {
        return NextResponse.json(
          { success: false, error: 'Cannot clock in for this shift' },
          { status: 400 }
        );
      }
      
      // Clock in and start shift
      const attendance = await clockInForShift(
        shiftId,
        session.driverId,
        shift.vehicleId,
        shift.tenantId,
        latitude,
        longitude,
        shift.scheduledStart
      );
      
      await startShift(shiftId);
      
      return NextResponse.json({
        success: true,
        data: {
          attendance: {
            $id: attendance.$id,
            clockInTime: attendance.clockInTime,
            status: attendance.status,
          },
        },
        message: 'Clocked in successfully',
      });
    } else if (action === 'clock_out') {
      if (shift.status !== 'in_progress') {
        return NextResponse.json(
          { success: false, error: 'Cannot clock out for this shift' },
          { status: 400 }
        );
      }
      
      // Get attendance record
      const attendance = await getAttendanceByShift(shiftId);
      
      if (!attendance) {
        return NextResponse.json(
          { success: false, error: 'No attendance record found' },
          { status: 404 }
        );
      }
      
      // Clock out and complete shift
      const updatedAttendance = await clockOut(attendance.$id, latitude, longitude);
      await completeShift(shiftId);
      
      return NextResponse.json({
        success: true,
        data: {
          attendance: {
            $id: updatedAttendance.$id,
            clockInTime: updatedAttendance.clockInTime,
            clockOutTime: updatedAttendance.clockOutTime,
            status: updatedAttendance.status,
          },
        },
        message: 'Clocked out successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "clock_in" or "clock_out"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process attendance' },
      { status: 500 }
    );
  }
}
