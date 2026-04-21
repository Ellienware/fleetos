// app/api/join/route.ts
import { NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/appwrite/collections/tenants';
import { createOwner, getOwnerByIdNumber, getOwnerByEmail } from '@/lib/appwrite/collections/owners';
import { createVehicle } from '@/lib/appwrite/collections/vehicles';
import { createAdminClient, ID, Query } from '@/lib/appwrite/server';
import { APPWRITE_CONFIG, COLLECTIONS } from '@/lib/appwrite/config';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const slug = formData.get('slug') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const idNumber = formData.get('idNumber') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const address = formData.get('address') as string;
    const password = formData.get('password') as string;
    
    // File URLs
    const idDocumentUrl = formData.get('idDocumentUrl') as string | null;
    const operatingPermitUrl = formData.get('operatingPermitUrl') as string | null;
    
    // Vehicle data (optional)
    const vehicleRegistration = formData.get('vehicleRegistration') as string;
    const vehicleMake = formData.get('vehicleMake') as string;
    const vehicleModel = formData.get('vehicleModel') as string;
    const vehicleYear = formData.get('vehicleYear') as string;
    const vehicleCapacity = formData.get('vehicleCapacity') as string;
    const operatingPermitNumber = formData.get('operatingPermitNumber') as string;
    const operatingPermitExpiry = formData.get('operatingPermitExpiry') as string;
    const insuranceExpiry = formData.get('insuranceExpiry') as string;
    
    // Validate required fields
    if (!slug || !firstName || !lastName || !idNumber || !phone || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }
    
    // Get tenant by slug
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Association not found' },
        { status: 404 }
      );
    }
    
    // Check if owner already exists (by ID number or email)
    const existingByIdNumber = await getOwnerByIdNumber(tenant.$id, idNumber);
    if (existingByIdNumber) {
      return NextResponse.json(
        { success: false, error: 'An owner with this ID number already exists' },
        { status: 400 }
      );
    }
    
    const existingByEmail = await getOwnerByEmail(tenant.$id, email);
    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: 'An owner with this email already exists' },
        { status: 400 }
      );
    }
    
    const { users, databases } = createAdminClient();
    
    // ✅ Check if a profile already exists for this email (prevides duplicate across roles)
    const existingProfile = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.PROFILES,
      [Query.equal('email', email), Query.limit(1)]
    );
    if (existingProfile.documents.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }
    
    // Create Appwrite user account
    let userId: string;
    try {
      const user = await users.create(
        ID.unique(),
        email,
        phone,
        password,
        `${firstName} ${lastName}`
      );
      userId = user.$id;
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 409) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      console.error('User creation error:', err);
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }
    
    // Create profile for the owner
    const profileId = ID.unique();
    await databases.createDocument(
      APPWRITE_CONFIG.databaseId,
      COLLECTIONS.PROFILES,
      profileId,
      {
        userId: userId,
        email: email,
        name: `${firstName} ${lastName}`,
        role: 'OWNER',
        tenantId: tenant.$id,
        phone: phone,
        status: 'active',
      }
    );
    
    // Create owner with pending status
    const owner = await createOwner(tenant.$id, {
      userId,
      profileId: profileId,
      firstName,
      lastName,
      idNumber,
      phone,
      email,
      address,
      idDocumentUrl: idDocumentUrl || undefined,
      operatingPermitUrl: operatingPermitUrl || undefined,
      membershipStatus: 'pending',
    });
    
    // Create vehicle if data provided
    let vehicle = null;
    if (vehicleRegistration && vehicleMake && vehicleModel) {
      vehicle = await createVehicle(tenant.$id, {
        ownerId: owner.$id,
        registrationNumber: vehicleRegistration,
        make: vehicleMake,
        model: vehicleModel,
        year: parseInt(vehicleYear) || new Date().getFullYear(),
        capacity: parseInt(vehicleCapacity) || 15,
        operatingPermitNumber: operatingPermitNumber || '',
        operatingPermitExpiry: operatingPermitExpiry || '',
        insuranceExpiry: insuranceExpiry || '',
        status: 'pending',
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Please wait for approval.',
      data: {
        ownerId: owner.$id,
        vehicleId: vehicle?.$id,
      },
    });
  } catch (error) {
    console.error('Error processing registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process registration' },
      { status: 500 }
    );
  }
}