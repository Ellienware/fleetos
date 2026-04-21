import { NextResponse } from 'next/server';
import { verifyDriverOTP } from '@/lib/auth/driver-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, idNumber, otp } = body;
    
    if (!tenantId || !idNumber || !otp) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID, ID number, and OTP are required' },
        { status: 400 }
      );
    }
    
    const result = await verifyDriverOTP(tenantId, idNumber, otp);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      token: result.token,
      driver: {
        $id: result.driver?.$id,
        firstName: result.driver?.firstName,
        lastName: result.driver?.lastName,
        phone: result.driver?.phone,
        tenantId: result.driver?.tenantId,
        ownerId: result.driver?.ownerId,
      },
    });
  } catch (error) {
    console.error('Error verifying driver OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
