import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { getRoutesByTenant } from '@/lib/appwrite/collections/routes';

export async function GET(request: Request) {
  try {
    const session = await getDriverSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get active routes for the tenant
    const routes = await getRoutesByTenant(session.tenantId, 1, 100);
    
    // Filter to only active routes
    const activeRoutes = routes.documents.filter(route => route.status === 'active');
    
    return NextResponse.json({
      success: true,
      data: activeRoutes.map(route => ({
        $id: route.$id,
        name: route.name,
        code: route.code,
        origin: route.origin,
        destination: route.destination,
        distance: route.distance,
        baseFare: route.baseFare,
      })),
    });
  } catch (error) {
    console.error('Error getting driver routes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get routes' },
      { status: 500 }
    );
  }
}
