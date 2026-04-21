import { NextResponse } from 'next/server';
import { createAdminClient, Query, ID } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';
import type { GeofenceType } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    
    const response = await databases.listDocuments(
      databaseId,
      COLLECTIONS.GEOFENCES,
      [
        Query.equal('tenantId', tenantId),
        Query.orderDesc('createdAt'),
        Query.limit(100),
      ]
    );
    
    return NextResponse.json({
      documents: response.documents,
      total: response.total,
    });
  } catch (error) {
    console.error('Error fetching geofences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geofences' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenantId,
      name,
      type,
      coordinates,
      radius,
      isActive,
      alertOnEntry,
      alertOnExit,
      alertOnDwell,
      dwellTimeMinutes,
    } = body;
    
    if (!tenantId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    
    const now = new Date().toISOString();
    
    const geofence = await databases.createDocument(
      databaseId,
      COLLECTIONS.GEOFENCES,
      ID.unique(),
      {
        tenantId,
        name,
        type,
        coordinates: JSON.stringify(coordinates || []),
        radius: radius || 500,
        isActive: isActive ?? true,
        alertOnEntry: alertOnEntry ?? true,
        alertOnExit: alertOnExit ?? true,
        alertOnDwell: alertOnDwell ?? false,
        dwellTimeMinutes: dwellTimeMinutes || 10,
        createdAt: now,
        updatedAt: now,
      }
    );
    
    return NextResponse.json({
      success: true,
      data: geofence,
    });
  } catch (error) {
    console.error('Error creating geofence:', error);
    return NextResponse.json(
      { error: 'Failed to create geofence' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const geofenceId = searchParams.get('id');
    
    if (!geofenceId) {
      return NextResponse.json(
        { error: 'Geofence ID is required' },
        { status: 400 }
      );
    }
    
    const { databases } = createAdminClient();
    const { databaseId } = APPWRITE_CONFIG;
    
    await databases.deleteDocument(
      databaseId,
      COLLECTIONS.GEOFENCES,
      geofenceId
    );
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    return NextResponse.json(
      { error: 'Failed to delete geofence' },
      { status: 500 }
    );
  }
}
