import { NextRequest, NextResponse } from 'next/server';
import { upsertLiveLocation } from '@/lib/appwrite/collections/live-locations';
import { recordLocation } from '@/lib/appwrite/collections/location-history';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';

/**
 * POST /api/tracking/location
 * Receive location updates from driver mobile app
 * This endpoint is called by the driver app to report GPS location
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key (for driver app authentication)
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.TRACKING_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vehicleId, latitude, longitude, speed, heading, timestamp } = body;

    // Validate required fields
    if (!vehicleId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: vehicleId, latitude, longitude' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get vehicle to get tenantId
    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Update live location (fast, for real-time tracking)
    const liveLocation = await upsertLiveLocation({
      vehicleId,
      tenantId: vehicle.tenantId,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
    });

    // Record in history (for trip playback)
    // Throttle history recording to every 30 seconds
    const shouldRecordHistory = true; // In production, check last recorded timestamp
    if (shouldRecordHistory) {
      await recordLocation({
        vehicleId,
        tenantId: vehicle.tenantId,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: liveLocation.status,
        timestamp: liveLocation.timestamp,
      },
    });
  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/location
 * Get live locations for a tenant or specific vehicles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const vehicleId = searchParams.get('vehicleId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // TODO: Add authentication/authorization check here
    // Verify user has access to this tenant's data

    if (vehicleId) {
      // Get single vehicle location
      const { getLiveLocationByVehicle } = await import('@/lib/appwrite/collections/live-locations');
      const location = await getLiveLocationByVehicle(vehicleId);
      
      return NextResponse.json({
        success: true,
        data: location,
      });
    } else {
      // Get all locations for tenant
      const { getLiveLocationsByTenant } = await import('@/lib/appwrite/collections/live-locations');
      const locations = await getLiveLocationsByTenant(tenantId);
      
      return NextResponse.json({
        success: true,
        data: locations,
      });
    }
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      { error: 'Failed to get locations' },
      { status: 500 }
    );
  }
}
