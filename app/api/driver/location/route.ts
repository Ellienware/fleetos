import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { updateLiveLocation } from '@/lib/appwrite/collections/live-locations';
import { createLocationHistory } from '@/lib/appwrite/collections/location-history';
import { checkGeofences } from '@/lib/geo/geofence';

export async function POST(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!session.vehicleId) {
      return NextResponse.json(
        { success: false, error: 'No vehicle assigned' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { latitude, longitude, speed, heading, accuracy } = body;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Valid GPS coordinates are required' },
        { status: 400 }
      );
    }
    
    // Determine status based on speed
    let status: 'active' | 'idle' | 'offline' = 'active';
    if (typeof speed === 'number') {
      if (speed < 2) {
        status = 'idle';
      }
    }
    
    // Update live location
    await updateLiveLocation(
      session.vehicleId,
      session.tenantId,
      {
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || null,
        status,
        driverId: session.driverId,
      }
    );
    
    // Create location history entry
    await createLocationHistory(
      session.vehicleId,
      session.tenantId,
      {
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || null,
        driverId: session.driverId,
      }
    );
    
    // Check geofences (async, don't wait)
    checkGeofences(session.tenantId, session.vehicleId, session.driverId, {
      latitude,
      longitude,
    }).catch(error => {
      console.error('Error checking geofences:', error);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Location updated',
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Return driver's current assignment info
    return NextResponse.json({
      success: true,
      data: {
        driverId: session.driverId,
        vehicleId: session.vehicleId,
        tenantId: session.tenantId,
        hasVehicleAssigned: !!session.vehicleId,
      },
    });
  } catch (error) {
    console.error('Error getting location status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get location status' },
      { status: 500 }
    );
  }
}
