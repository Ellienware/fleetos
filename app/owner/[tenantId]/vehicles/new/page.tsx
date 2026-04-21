"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Car, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createOwnerVehicleAction } from "../../actions";

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

export default function NewVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    registrationNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    capacity: 15,
    operatingPermitNumber: "",
    operatingPermitExpiry: "",
    insuranceExpiry: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.registrationNumber.trim())
      e.registrationNumber = "Registration number is required";
    if (!formData.make.trim()) e.make = "Make is required";
    if (!formData.model.trim()) e.model = "Model is required";
    if (!formData.year || formData.year < 1990)
      e.year = "Valid year is required";
    if (!formData.capacity || formData.capacity < 1)
      e.capacity = "Valid capacity is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await createOwnerVehicleAction(tenantId, {
          registrationNumber: formData.registrationNumber,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          capacity: formData.capacity,
          operatingPermitNumber: formData.operatingPermitNumber,
          operatingPermitExpiry: formData.operatingPermitExpiry,
          insuranceExpiry: formData.insuranceExpiry,
        });
        if (result.success) {
          toast.success("Vehicle added successfully");
          router.push(`/owner/${tenantId}/vehicles`);
        } else {
          toast.error(result.error || "Failed to add vehicle");
        }
      } catch {
        toast.error("Failed to add vehicle");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/owner/${tenantId}/vehicles`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add vehicle</h1>
          <p className="text-sm text-muted-foreground">
            Register a new vehicle under your ownership.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vehicle details */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Vehicle details</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Registration number"
              required
              error={errors.registrationNumber}
            >
              <input
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="GP 123 456"
                className={inputClass(errors.registrationNumber)}
              />
            </Field>

            <Field label="Capacity (seats)" required error={errors.capacity}>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleNumberChange}
                min={1}
                max={100}
                className={inputClass(errors.capacity)}
              />
            </Field>

            <Field label="Make" required error={errors.make}>
              <input
                name="make"
                value={formData.make}
                onChange={handleChange}
                placeholder="Toyota"
                className={inputClass(errors.make)}
              />
            </Field>

            <Field label="Model" required error={errors.model}>
              <input
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Quantum"
                className={inputClass(errors.model)}
              />
            </Field>

            <Field label="Year" required error={errors.year}>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleNumberChange}
                min={1990}
                max={new Date().getFullYear() + 1}
                className={inputClass(errors.year)}
              />
            </Field>
          </div>
        </div>

        {/* Compliance documents */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              Compliance documents
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Operating permit number">
              <input
                name="operatingPermitNumber"
                value={formData.operatingPermitNumber}
                onChange={handleChange}
                placeholder="OL/GP/12345"
                className={inputClass()}
              />
            </Field>

            <Field label="Permit expiry date">
              <input
                type="date"
                name="operatingPermitExpiry"
                value={formData.operatingPermitExpiry}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>

            <Field label="Insurance expiry date">
              <input
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
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
            {isPending ? "Saving…" : "Add vehicle"}
          </button>
          <Link href={`/owner/${tenantId}/vehicles`}>
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