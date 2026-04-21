import { NextResponse } from 'next/server';
import { requestDriverOTP } from '@/lib/auth/driver-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, idNumber } = body;
    
    if (!tenantId || !idNumber) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID and ID number are required' },
        { status: 400 }
      );
    }
    
    const result = await requestDriverOTP(tenantId, idNumber);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error requesting driver OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to request OTP' },
      { status: 500 }
    );
  }
}
