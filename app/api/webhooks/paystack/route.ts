import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature, fromKobo, type PaystackWebhookEvent } from '@/lib/paystack';
import { getPaymentByReference, markPaymentCompleted, updatePayment } from '@/lib/appwrite/collections/payments';
import { updateOwnerMembershipStatus } from '@/lib/appwrite/collections/owners';
import { updateSubscription, getSubscriptionByTenant } from '@/lib/appwrite/collections/subscriptions';
import { updateTenantSubscriptionStatus } from '@/lib/appwrite/collections/tenants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    // Validate webhook signature
    if (!validateWebhookSignature(body, signature)) {
      console.error('Invalid Paystack webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event: PaystackWebhookEvent = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event);
        break;

      case 'charge.failed':
        await handleChargeFailed(event);
        break;

      case 'subscription.create':
        await handleSubscriptionCreate(event);
        break;

      case 'subscription.disable':
        await handleSubscriptionDisable(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      default:
        console.log('Unhandled Paystack event:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful charge (one-time payment)
 */
async function handleChargeSuccess(event: PaystackWebhookEvent) {
  const { reference, metadata } = event.data;

  // Find payment by reference
  const payment = await getPaymentByReference(reference);
  if (!payment) {
    console.error('Payment not found for reference:', reference);
    return;
  }

  // Mark payment as completed
  await markPaymentCompleted(payment.$id, event.data.id.toString());

  // Update owner membership status if this is a membership payment
  if (metadata?.paymentType === 'membership' && metadata?.ownerId) {
    await updateOwnerMembershipStatus(metadata.ownerId as string, 'active');
  }

  console.log('Charge success processed for:', reference);
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(event: PaystackWebhookEvent) {
  const { reference } = event.data;

  const payment = await getPaymentByReference(reference);
  if (payment) {
    await updatePayment(payment.$id, { status: 'failed' });
  }

  console.log('Charge failed processed for:', reference);
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreate(event: PaystackWebhookEvent) {
  const { metadata, subscription_code } = event.data;

  if (metadata?.tenantId && subscription_code) {
    const subscription = await getSubscriptionByTenant(metadata.tenantId as string);
    if (subscription) {
      await updateSubscription(subscription.$id, {
        paystackSubscriptionCode: subscription_code,
        status: 'active',
      });

      await updateTenantSubscriptionStatus(metadata.tenantId as string, 'active');
    }
  }

  console.log('Subscription created:', subscription_code);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDisable(event: PaystackWebhookEvent) {
  const { metadata, subscription_code } = event.data;

  if (metadata?.tenantId) {
    const subscription = await getSubscriptionByTenant(metadata.tenantId as string);
    if (subscription) {
      await updateSubscription(subscription.$id, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });

      await updateTenantSubscriptionStatus(metadata.tenantId as string, 'cancelled');
    }
  }

  console.log('Subscription disabled:', subscription_code);
}

/**
 * Handle failed subscription invoice payment
 */
async function handleInvoicePaymentFailed(event: PaystackWebhookEvent) {
  const { metadata } = event.data;

  if (metadata?.tenantId) {
    const subscription = await getSubscriptionByTenant(metadata.tenantId as string);
    if (subscription) {
      await updateSubscription(subscription.$id, {
        status: 'expired',
      });

      await updateTenantSubscriptionStatus(metadata.tenantId as string, 'expired');
    }
  }

  console.log('Invoice payment failed for tenant:', metadata?.tenantId);
}
