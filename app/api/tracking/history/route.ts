import { NextRequest, NextResponse } from 'next/server';
import { getVehicleHistory, getTripSummary, getRecentLocations } from '@/lib/appwrite/collections/location-history';

/**
 * GET /api/tracking/history
 * Get location history for trip playback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get('vehicleId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const count = searchParams.get('count');
    const summary = searchParams.get('summary');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId is required' },
        { status: 400 }
      );
    }

    // TODO: Add authentication/authorization check here
    // Verify user has access to this vehicle's data

    // If requesting just recent locations
    if (count && !startTime && !endTime) {
      const locations = await getRecentLocations(vehicleId, parseInt(count));
      return NextResponse.json({
        success: true,
        data: locations,
      });
    }

    // Validate time range
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required for history queries' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Limit range to 24 hours to prevent excessive queries
    const maxRange = 24 * 60 * 60 * 1000; // 24 hours in ms
    if (end.getTime() - start.getTime() > maxRange) {
      return NextResponse.json(
        { error: 'Time range cannot exceed 24 hours' },
        { status: 400 }
      );
    }

    // If requesting summary only
    if (summary === 'true') {
      const tripSummary = await getTripSummary(vehicleId, startTime, endTime);
      return NextResponse.json({
        success: true,
        data: tripSummary,
      });
    }

    // Get full history
    const history = await getVehicleHistory(vehicleId, startTime, endTime);

    return NextResponse.json({
      success: true,
      data: {
        vehicleId,
        startTime,
        endTime,
        points: history,
        count: history.length,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Failed to get location history' },
      { status: 500 }
    );
  }
}
