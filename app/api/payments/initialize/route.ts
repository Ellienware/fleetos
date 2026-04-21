import { NextRequest, NextResponse } from 'next/server';
import { initializePayment, generateReference, toKobo } from '@/lib/paystack';
import { createPayment } from '@/lib/appwrite/collections/payments';
import { getOwnerById } from '@/lib/appwrite/collections/owners';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, ownerId, amount, paymentType, period, email, callbackUrl } = body;

    // Validate required fields
    if (!tenantId || !ownerId || !amount || !paymentType || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get owner details for metadata
    const owner = await getOwnerById(ownerId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner not found' },
        { status: 404 }
      );
    }

    // Generate unique reference
    const reference = generateReference('MEM');

    // Initialize Paystack payment
    const paystackResponse = await initializePayment({
      email,
      amount: toKobo(amount),
      reference,
      callback_url: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
      metadata: {
        tenantId,
        ownerId,
        paymentType,
        period: period || new Date().toISOString().slice(0, 7),
        ownerName: `${owner.firstName} ${owner.lastName}`,
      },
    });

    // Create pending payment record
    await createPayment({
      tenantId,
      ownerId,
      amount,
      paymentType,
      period: period || new Date().toISOString().slice(0, 7),
      paystackReference: reference,
    });

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        access_code: paystackResponse.data.access_code,
      },
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
