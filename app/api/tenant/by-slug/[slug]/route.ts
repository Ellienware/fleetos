import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/appwrite/collections/tenants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }
    
    const tenant = await getTenantBySlug(slug);
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Return only public tenant info
    return NextResponse.json({
      $id: tenant.$id,
      name: tenant.name,
      logo: tenant.logo || null,
      membershipFee: tenant.settings?.membershipFee || null,
    });
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}
