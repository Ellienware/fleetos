/**
 * Paystack Integration Library
 * Handles payment initialization, verification, and webhook processing
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    metadata: Record<string, unknown>;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

export interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    customer: number;
    plan: number;
    integration: number;
    domain: string;
    start: number;
    status: string;
    quantity: number;
    amount: number;
    subscription_code: string;
    email_token: string;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    created_at: string;
    updated_at: string;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    metadata: {
      tenantId?: string;
      ownerId?: string;
      paymentType?: string;
      period?: string;
      subscriptionId?: string;
      [key: string]: unknown;
    };
    customer: {
      id: number;
      customer_code: string;
      email: string;
    };
    plan?: {
      id: number;
      plan_code: string;
      name: string;
    };
    subscription_code?: string;
  };
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment(params: {
  email: string;
  amount: number; // Amount in kobo (cents)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
}): Promise<PaystackInitializeResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
      channels: params.channels || ['card', 'bank', 'ussd', 'bank_transfer'],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to initialize payment');
  }

  return response.json();
}

/**
 * Verify a payment transaction
 */
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify payment');
  }

  return response.json();
}

/**
 * Create a subscription plan
 */
export async function createPlan(params: {
  name: string;
  amount: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'annually';
  description?: string;
}): Promise<{ status: boolean; data: { plan_code: string; id: number } }> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create plan');
  }

  return response.json();
}

/**
 * Create a subscription
 */
export async function createSubscription(params: {
  customer: string; // Customer email or code
  plan: string; // Plan code
  authorization?: string; // Authorization code from a previous transaction
  start_date?: string;
}): Promise<PaystackSubscriptionResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/subscription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create subscription');
  }

  return response.json();
}

/**
 * Disable a subscription
 */
export async function disableSubscription(params: {
  code: string;
  token: string;
}): Promise<{ status: boolean; message: string }> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to disable subscription');
  }

  return response.json();
}

/**
 * Create or retrieve a customer
 */
export async function createCustomer(params: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<{ status: boolean; data: { customer_code: string; id: number } }> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create customer');
  }

  return response.json();
}

/**
 * Generate a unique payment reference
 */
export function generateReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`.toUpperCase();
}

/**
 * Validate Paystack webhook signature
 */
export function validateWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');
  return hash === signature;
}

/**
 * Get Paystack public key for frontend
 */
export function getPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY;
}

/**
 * Convert ZAR amount to kobo (cents)
 */
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert kobo back to ZAR
 */
export function fromKobo(kobo: number): number {
  return kobo / 100;
}
