'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bus, Loader2, Phone, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

type Step = 'id' | 'otp';

export default function DriverLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  
  const [step, setStep] = useState<Step>('id');
  const [idNumber, setIdNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    
    if (!tenantId) {
      toast({
        title: 'Error',
        description: 'Association not specified. Please use the link provided by your association.',
        variant: 'destructive',
      });
      return;
    }
    
    if (idNumber.length !== 13) {
      toast({
        title: 'Invalid ID Number',
        description: 'Please enter a valid 13-digit South African ID number.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/driver/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, idNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      toast({
        title: 'OTP Sent',
        description: 'A one-time password has been sent to your registered phone number.',
      });
      setStep('otp');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit code sent to your phone.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/driver/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, idNumber, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('driver_token', data.token);
        localStorage.setItem('driver_tenant', tenantId);
        
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        
        router.push(`/driver/dashboard?tenant=${tenantId}`);
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    setStep('id');
    setOtp('');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Bus className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">TaxiSaaS</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Driver Login</CardTitle>
          <CardDescription>
            {step === 'id' 
              ? 'Enter your ID number to receive a one-time password'
              : 'Enter the OTP sent to your phone'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'id' ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idNumber">South African ID Number</Label>
                <div className="relative">
                  <Input
                    id="idNumber"
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter your 13-digit ID number"
                    className="font-mono pl-10"
                    required
                  />
                  <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your ID number must be registered with your taxi association.
                </p>
              </div>

              {!tenantId && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  No association specified. Please use the login link provided by your association.
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !tenantId}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Request OTP
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-4">
                <Label>Enter 6-digit OTP</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  OTP expires in 5 minutes
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Login'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={isLoading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Not a driver?{' '}
        <a href="/login" className="text-primary hover:underline">
          Login as admin or owner
        </a>
      </p>
    </div>
  );
}
