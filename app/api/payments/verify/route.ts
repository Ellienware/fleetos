import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, fromKobo } from '@/lib/paystack';
import { getPaymentByReference, markPaymentCompleted } from '@/lib/appwrite/collections/payments';
import { updateOwnerMembershipStatus } from '@/lib/appwrite/collections/owners';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const verification = await verifyPayment(reference);

    if (verification.data.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: verification.data.status,
        message: verification.data.gateway_response,
      });
    }

    // Get payment record
    const payment = await getPaymentByReference(reference);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Mark payment as completed if not already
    if (payment.status !== 'completed') {
      await markPaymentCompleted(payment.$id, verification.data.id.toString());

      // Update owner membership status to active
      await updateOwnerMembershipStatus(payment.ownerId, 'active');
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: verification.data.reference,
        amount: fromKobo(verification.data.amount),
        status: verification.data.status,
        paidAt: verification.data.paid_at,
        channel: verification.data.channel,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
