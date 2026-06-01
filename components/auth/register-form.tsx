'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { register } from '@/app/(auth)/actions';


// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function TextInput({
  id,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
}: {
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required
      disabled={disabled}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Register form
// ---------------------------------------------------------------------------

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const result = await register(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <h1 className="text-xl font-semibold">Registration successful</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your association account has been created. You can now sign in to
          access your dashboard.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="mt-6 flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Continue to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border bg-card p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold">Register your association</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account to manage your taxi association
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <SectionLabel>Association details</SectionLabel>

        <FormField label="Association name">
          <TextInput
            id="associationName"
            name="associationName"
            placeholder="e.g. Gauteng Taxi Association"
            disabled={isLoading}
          />
        </FormField>

        <FormField
          label="Registration number"
          hint="Your official business registration number"
        >
          <TextInput
            id="registrationNumber"
            name="registrationNumber"
            placeholder="Business registration number"
            disabled={isLoading}
          />
        </FormField>

        <SectionLabel>Admin account</SectionLabel>

        <FormField label="full name">
          <TextInput
            id="name"
            name="name"
            placeholder=""
            autoComplete="name"
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Email address">
          <TextInput
            id="email"
            name="email"
            type="email"
            placeholder="admin@association.co.za"
            autoComplete="email"
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Phone number">
          <TextInput
            id="phone"
            name="phone"
            type="tel"
            placeholder="+27 12 345 6789"
            autoComplete="tel"
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Password" hint="Must be at least 8 characters">
          <TextInput
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Confirm password">
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </FormField>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <p className="text-center text-xs text-muted-foreground">
          By registering, you agree to our{' '}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}