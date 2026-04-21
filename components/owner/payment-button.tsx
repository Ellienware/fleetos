'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PaymentButtonProps {
  ownerId: string;
  tenantId: string;
  amount: number;
  type: 'membership' | 'fine';
  label: string;
  ownerEmail: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  fineId?: string;
}

export function PaymentButton({
  ownerId,
  tenantId,
  amount,
  type,
  label,
  ownerEmail,
  variant = 'default',
  fineId,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handlePayment() {
    if (amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Payment amount must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId,
          tenantId,
          amount: amount * 100, // Paystack expects amount in kobo (cents)
          email: ownerEmail,
          paymentType: type,
          fineId,
          callbackUrl: `${window.location.origin}/owner/${tenantId}/payments/callback`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      if (data.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading || amount <= 0}
      variant={variant}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
