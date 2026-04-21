'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Bus,
  User,
  Mail,
  MapPin,
  CreditCard,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Car,
  Calendar,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantInfo {
  $id: string;
  name: string;
  logo?: string;
  membershipFee?: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputClass = (error?: string) =>
  cn(
    'w-full rounded-md border bg-background py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
    error ? 'border-destructive' : 'border-border'
  );

function TextInput({
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  icon,
  maxLength,
  min,
  max,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  icon?: React.ReactNode;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      )}
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        maxLength={maxLength}
        min={min}
        max={max}
        className={cn(inputClass(error), icon ? 'pl-8 pr-3' : 'px-3')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step bar
// ---------------------------------------------------------------------------

const STEPS = [
  { n: 1, label: 'Personal info' },
  { n: 2, label: 'Vehicle info' },
  { n: 3, label: 'Documents' },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                current > s.n
                  ? 'bg-green-500 text-white'
                  : current === s.n
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {current > s.n ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                s.n
              )}
            </div>
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                current === s.n
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'mx-2 mb-4 h-px flex-1 transition-colors',
                current > s.n ? 'bg-green-400' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop zone
// ---------------------------------------------------------------------------

function DropZone({
  label,
  optional,
  file,
  onFile,
  onRemove,
}: {
  label: string;
  optional?: boolean;
  file: File | null;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {optional && (
          <span className="ml-1 text-muted-foreground/60">(optional)</span>
        )}
      </label>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          file
            ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
            : 'border-border hover:border-foreground/30'
        )}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="max-w-[200px] truncate text-sm font-medium text-green-700 dark:text-green-300">
              {file.name}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="ml-2 text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click or drag to upload
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Max 5MB · JPEG, PNG, or PDF
            </p>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JoinAssociationPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    data: tenant,
    error: tenantError,
    isLoading: tenantLoading,
  } = useSWR<TenantInfo>(`/api/tenant/by-slug/${slug}`, fetcher);

  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    vehicleRegistration: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear().toString(),
    vehicleCapacity: '15',
    operatingPermitNumber: '',
    operatingPermitExpiry: '',
    insuranceExpiry: '',
  });

  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [operatingPermit, setOperatingPermit] = useState<File | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePhoneChange = (value?: string) => {
    setFormData((prev) => ({ ...prev, phone: value ?? '' }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.idNumber.trim()) e.idNumber = 'ID number is required';
    else if (!/^\d{13}$/.test(formData.idNumber))
      e.idNumber = 'ID number must be 13 digits';
    if (!formData.phone) e.phone = 'Phone number is required';
    else if (!isValidPhoneNumber(formData.phone))
      e.phone = 'Invalid phone number';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Invalid email format';
    if (!formData.address.trim()) e.address = 'Address is required';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const hasVehicle =
      formData.vehicleRegistration ||
      formData.vehicleMake ||
      formData.vehicleModel;
    if (!hasVehicle) return true;
    const e: Record<string, string> = {};
    if (!formData.vehicleRegistration.trim())
      e.vehicleRegistration = 'Registration is required';
    if (!formData.vehicleMake.trim()) e.vehicleMake = 'Make is required';
    if (!formData.vehicleModel.trim()) e.vehicleModel = 'Model is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsUploading(true);

    let idUrl: string | null = null;
    let permitUrl: string | null = null;

    try {
      if (idDocument) {
        const fd = new FormData();
        fd.append('file', idDocument);
        fd.append('type', 'id');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await res.json();
        if (!d.success)
          throw new Error('ID upload failed: ' + (d.error ?? ''));
        idUrl = d.url;
      }
      if (operatingPermit) {
        const fd = new FormData();
        fd.append('file', operatingPermit);
        fd.append('type', 'permit');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await res.json();
        if (!d.success)
          throw new Error('Permit upload failed: ' + (d.error ?? ''));
        permitUrl = d.url;
      }
    } catch (err: any) {
      setSubmitError(err.message ?? 'File upload failed. Please try again.');
      setIsUploading(false);
      return;
    }

    setIsUploading(false);

    startTransition(async () => {
      try {
        const data = new FormData();
        data.append('slug', slug);
        Object.entries(formData).forEach(([k, v]) => data.append(k, v));
        if (idUrl) data.append('idDocumentUrl', idUrl);
        if (permitUrl) data.append('operatingPermitUrl', permitUrl);

        const response = await fetch('/api/join', {
          method: 'POST',
          body: data,
        });
        const result = await response.json();
        if (!result.success) {
          setSubmitError(result.error ?? 'Registration failed');
          return;
        }
        setIsSuccess(true);
      } catch {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    });
  };

  // ---------------------------------------------------------------------------
  // State screens
  // ---------------------------------------------------------------------------

  if (tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Loading association details…</p>
        </div>
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-base font-medium">Association not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The association you&apos;re looking for doesn&apos;t exist or the
            link may be incorrect.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <p className="text-base font-medium">Registration submitted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your application has been submitted to{' '}
            <span className="font-medium text-foreground">{tenant.name}</span>.
            You&apos;ll receive an email once your membership is approved.
          </p>
          <div className="mt-5 rounded-lg border bg-muted/40 p-3.5 text-left">
            <p className="text-xs font-medium">What happens next?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The admin will review your application and documents. This
              typically takes 1–3 business days.
            </p>
          </div>
          <Link
            href="/"
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
              <Bus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold">{tenant.name}</p>
              <p className="text-xs text-muted-foreground">
                Owner registration
              </p>
            </div>
          </div>
        </div>

        <StepBar current={step} />

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border bg-card p-6">

            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="mb-5 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Personal information</p>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" required error={errors.firstName}>
                      <TextInput
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        error={errors.firstName}
                      />
                    </Field>
                    <Field label="Last name" required error={errors.lastName}>
                      <TextInput
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        error={errors.lastName}
                      />
                    </Field>
                  </div>

                  <Field label="SA ID number" required error={errors.idNumber}>
                    <TextInput
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      placeholder="9001015009087"
                      maxLength={13}
                      error={errors.idNumber}
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone number" required error={errors.phone}>
                      <PhoneInput
                        international
                        defaultCountry="ZA"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="Enter phone number"
                        className={cn(
                          'phone-input-wrapper w-full rounded-md border bg-background py-1.5 pl-3 text-sm focus-within:ring-1 focus-within:ring-ring',
                          errors.phone ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {/* PhoneInput requires some global CSS — see style.css import */}
                    </Field>
                    <Field label="Email" required error={errors.email}>
                      <TextInput
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        type="email"
                        error={errors.email}
                        icon={<Mail className="h-3.5 w-3.5" />}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Physical address"
                    required
                    error={errors.address}
                  >
                    <TextInput
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Main Street, City, Province"
                      error={errors.address}
                      icon={<MapPin className="h-3.5 w-3.5" />}
                    />
                  </Field>

                  <div className="h-px bg-border" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Password" required error={errors.password}>
                      <TextInput
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 8 characters"
                        type="password"
                        error={errors.password}
                      />
                    </Field>
                    <Field
                      label="Confirm password"
                      required
                      error={errors.confirmPassword}
                    >
                      <TextInput
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        type="password"
                        error={errors.confirmPassword}
                      />
                    </Field>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                    >
                      Next step
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <div className="mb-5 flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Vehicle information</p>
                </div>

                <div className="mb-4 rounded-lg border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
                  Vehicle registration is optional — you can add vehicles after
                  your membership is approved.
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Registration number"
                      error={errors.vehicleRegistration}
                    >
                      <TextInput
                        name="vehicleRegistration"
                        value={formData.vehicleRegistration}
                        onChange={handleChange}
                        placeholder="GP 123 456"
                        error={errors.vehicleRegistration}
                      />
                    </Field>
                    <Field label="Seating capacity">
                      <TextInput
                        name="vehicleCapacity"
                        value={formData.vehicleCapacity}
                        onChange={handleChange}
                        type="number"
                        min={4}
                        max={70}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Make" error={errors.vehicleMake}>
                      <TextInput
                        name="vehicleMake"
                        value={formData.vehicleMake}
                        onChange={handleChange}
                        placeholder="Toyota"
                        error={errors.vehicleMake}
                      />
                    </Field>
                    <Field label="Model" error={errors.vehicleModel}>
                      <TextInput
                        name="vehicleModel"
                        value={formData.vehicleModel}
                        onChange={handleChange}
                        placeholder="Quantum"
                        error={errors.vehicleModel}
                      />
                    </Field>
                    <Field label="Year">
                      <TextInput
                        name="vehicleYear"
                        value={formData.vehicleYear}
                        onChange={handleChange}
                        type="number"
                        min={2000}
                        max={new Date().getFullYear() + 1}
                      />
                    </Field>
                  </div>

                  <div className="h-px bg-border" />

                  <Field label="Operating permit number">
                    <TextInput
                      name="operatingPermitNumber"
                      value={formData.operatingPermitNumber}
                      onChange={handleChange}
                      placeholder="OL/GP/12345"
                      icon={<Shield className="h-3.5 w-3.5" />}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Permit expiry date">
                      <TextInput
                        name="operatingPermitExpiry"
                        value={formData.operatingPermitExpiry}
                        onChange={handleChange}
                        type="date"
                        icon={<Calendar className="h-3.5 w-3.5" />}
                      />
                    </Field>
                    <Field label="Insurance expiry date">
                      <TextInput
                        name="insuranceExpiry"
                        value={formData.insuranceExpiry}
                        onChange={handleChange}
                        type="date"
                        icon={<Calendar className="h-3.5 w-3.5" />}
                      />
                    </Field>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                    >
                      Next step
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <>
                <div className="mb-5 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Document upload</p>
                </div>

                {submitError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {submitError}
                  </div>
                )}

                <div className="space-y-4">
                  <DropZone
                    label="ID document (copy of ID or passport)"
                    file={idDocument}
                    onFile={setIdDocument}
                    onRemove={() => setIdDocument(null)}
                  />
                  <DropZone
                    label="Operating permit"
                    optional
                    file={operatingPermit}
                    onFile={setOperatingPermit}
                    onRemove={() => setOperatingPermit(null)}
                  />

                  {tenant.membershipFee && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="rounded-lg border bg-muted/40 px-3.5 py-3">
                        <p className="text-xs font-medium">Membership fee</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Monthly fee:{' '}
                          <span className="font-medium text-foreground">
                            R{tenant.membershipFee.toFixed(2)}
                          </span>
                          . Payment details will be sent after approval.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || isUploading}
                      className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading files…
                        </>
                      ) : isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          Submit registration
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in to your account
          </Link>
        </p>
      </div>
    </div>
  );
}