import { NextResponse } from 'next/server';
import { getDriverSessionFromRequest } from '@/lib/auth/driver-auth';
import { getNotificationsByTenant } from '@/lib/appwrite/collections/notifications';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    
    // Get broadcast announcements for the tenant
    const notifications = await getNotificationsByTenant(session.tenantId, page, limit);
    
    // Filter to only announcements (broadcast type)
    const announcements = notifications.documents.filter(
      n => n.type === 'announcement'
    );
    
    return NextResponse.json({
      success: true,
      data: announcements.map(a => ({
        $id: a.$id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        createdAt: a.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: announcements.length,
        hasMore: notifications.hasMore,
      },
    });
  } catch (error) {
    console.error('Error getting driver announcements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get announcements' },
      { status: 500 }
    );
  }
}
