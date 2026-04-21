"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, User, Shield, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createOwnerDriverAction } from "../../actions";

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
    "w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
    error ? "border-destructive" : "border-border"
  );

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewDriverPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    phone: "",
    email: "",
    address: "",
    prdpNumber: "",
    prdpExpiry: "",
    driverLicenseNumber: "",
    driverLicenseExpiry: "",
    driverLicenseCode: "B",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim()) e.lastName = "Last name is required";
    if (!formData.idNumber.trim()) e.idNumber = "ID number is required";
    else if (!/^\d{13}$/.test(formData.idNumber))
      e.idNumber = "ID number must be 13 digits";
    if (!formData.phone.trim()) e.phone = "Phone number is required";
    if (!formData.prdpNumber.trim()) e.prdpNumber = "PrDP number is required";
    if (!formData.prdpExpiry) e.prdpExpiry = "PrDP expiry date is required";
    if (!formData.driverLicenseNumber.trim())
      e.driverLicenseNumber = "Driver licence number is required";
    if (!formData.driverLicenseExpiry)
      e.driverLicenseExpiry = "Licence expiry date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await createOwnerDriverAction(tenantId, formData);
        if (result.success) {
          toast.success("Driver added successfully");
          // Force a full page reload with cache‑busting timestamp
          window.location.href = `/owner/${tenantId}/drivers?t=${Date.now()}`;
        } else {
          toast.error(result.error ?? "Failed to add driver");
        }
      } catch {
        toast.error("Failed to add driver");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/owner/${tenantId}/drivers`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add driver</h1>
          <p className="text-sm text-muted-foreground">
            Register a new driver to work with your vehicles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal information */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Personal information</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.firstName}>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={inputClass(errors.firstName)}
              />
            </Field>
            <Field label="Last name" required error={errors.lastName}>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={inputClass(errors.lastName)}
              />
            </Field>
            <Field label="ID number" required error={errors.idNumber}>
              <input
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                maxLength={13}
                placeholder="9001015009087"
                className={inputClass(errors.idNumber)}
              />
            </Field>
            <Field label="Phone number" required error={errors.phone}>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0821234567"
                  className={cn(inputClass(errors.phone), "pl-8")}
                />
              </div>
            </Field>
            <Field label="Email address">
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                className={inputClass()}
              />
            </Field>
            <Field label="Physical address">
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
          </div>
        </div>

        {/* Licensing */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Licensing & permits</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PrDP number" required error={errors.prdpNumber}>
              <input
                name="prdpNumber"
                value={formData.prdpNumber}
                onChange={handleChange}
                placeholder="PRDP123456"
                className={inputClass(errors.prdpNumber)}
              />
            </Field>
            <Field label="PrDP expiry date" required error={errors.prdpExpiry}>
              <input
                type="date"
                name="prdpExpiry"
                value={formData.prdpExpiry}
                onChange={handleChange}
                className={inputClass(errors.prdpExpiry)}
              />
            </Field>
            <Field
              label="Driver licence number"
              required
              error={errors.driverLicenseNumber}
            >
              <input
                name="driverLicenseNumber"
                value={formData.driverLicenseNumber}
                onChange={handleChange}
                placeholder="LIC123456"
                className={inputClass(errors.driverLicenseNumber)}
              />
            </Field>
            <Field
              label="Licence expiry date"
              required
              error={errors.driverLicenseExpiry}
            >
              <input
                type="date"
                name="driverLicenseExpiry"
                value={formData.driverLicenseExpiry}
                onChange={handleChange}
                className={inputClass(errors.driverLicenseExpiry)}
              />
            </Field>
            <Field label="Licence code" required>
              <select
                name="driverLicenseCode"
                value={formData.driverLicenseCode}
                onChange={handleChange}
                className={inputClass()}
              >
                <option value="B">B – Light Motor Vehicle</option>
                <option value="C">C – Heavy Motor Vehicle</option>
                <option value="C1">C1 – Heavy Vehicle (3500–16000kg)</option>
                <option value="EC">EC – Extra Heavy with Trailer</option>
                <option value="EC1">
                  EC1 – Extra Heavy with Trailer (Limited)
                </option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isPending ? "Saving…" : "Add driver"}
          </button>
          <Link href={`/owner/${tenantId}/drivers`}>
            <button
              type="button"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}