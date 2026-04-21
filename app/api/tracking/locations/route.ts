import { NextRequest, NextResponse } from 'next/server';
import { getLiveLocationsByTenant, updateStaleStatuses } from '@/lib/appwrite/collections/live-locations';
import { getVehicleById } from '@/lib/appwrite/collections/vehicles';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    );
  }

  try {
    // Update any stale statuses first
    await updateStaleStatuses(tenantId);

    // Fetch all live locations for this tenant
    const locations = await getLiveLocationsByTenant(tenantId);

    // Fetch vehicle details for each location
    const locationsWithVehicles = await Promise.all(
      locations.map(async (location) => {
        try {
          const vehicle = await getVehicleById(location.vehicleId);
          return {
            ...location,
            vehicle: vehicle || null,
          };
        } catch {
          return {
            ...location,
            vehicle: null,
          };
        }
      })
    );

    return NextResponse.json({
      locations: locationsWithVehicles,
      total: locationsWithVehicles.length,
    });
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations', locations: [] },
      { status: 500 }
    );
  }
}
