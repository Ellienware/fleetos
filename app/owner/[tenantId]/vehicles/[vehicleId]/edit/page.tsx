"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Car, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getOwnerVehiclesAction, updateOwnerVehicleAction } from "../../../actions";
import type { VehicleStatus } from "@/types";

// ---------------------------------------------------------------------------
// Primitives (shared with new-vehicle page)
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const vehicleId = params.vehicleId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    capacity: 15,
    operatingPermitNumber: "",
    operatingPermitExpiry: "",
    insuranceExpiry: "",
    status: "active" as VehicleStatus,
  });

  useEffect(() => {
    async function fetchVehicle() {
      try {
        const result = await getOwnerVehiclesAction(tenantId);
        if (result.success && result.data) {
          const vehicle = (result.data.documents ?? []).find(
            (v: any) => v.$id === vehicleId
          );
          if (vehicle) {
            setFormData({
              registrationNumber: vehicle.registrationNumber ?? "",
              make: vehicle.make ?? "",
              model: vehicle.model ?? "",
              year: vehicle.year ?? new Date().getFullYear(),
              capacity: vehicle.capacity ?? 15,
              operatingPermitNumber: vehicle.operatingPermitNumber ?? "",
              operatingPermitExpiry: vehicle.operatingPermitExpiry ?? "",
              insuranceExpiry: vehicle.insuranceExpiry ?? "",
              status: vehicle.status ?? "active",
            });
          } else {
            setFetchError("Vehicle not found");
          }
        } else {
          setFetchError(result.error ?? "Failed to load vehicle");
        }
      } catch {
        setFetchError("Failed to load vehicle");
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicle();
  }, [tenantId, vehicleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateOwnerVehicleAction(
          tenantId,
          vehicleId,
          formData
        );
        if (result.success) {
          toast.success("Vehicle updated successfully");
          router.push(`/owner/${tenantId}/vehicles`);
        } else {
          toast.error(result.error ?? "Failed to update vehicle");
        }
      } catch {
        toast.error("Failed to update vehicle");
      }
    });
  };

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Link
          href={`/owner/${tenantId}/vehicles`}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Back to vehicles
        </Link>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Edit vehicle</h1>
          <p className="text-sm text-muted-foreground">
            Update your vehicle information.
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
            <Field label="Registration number" required>
              <input
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Capacity (seats)" required>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleNumberChange}
                min={1}
                max={100}
                className={inputClass}
              />
            </Field>

            <Field label="Make" required>
              <input
                name="make"
                value={formData.make}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Model" required>
              <input
                name="model"
                value={formData.model}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Year" required>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleNumberChange}
                min={1990}
                max={new Date().getFullYear() + 1}
                className={inputClass}
              />
            </Field>

            <Field label="Status">
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Compliance */}
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
                className={inputClass}
              />
            </Field>

            <Field label="Permit expiry date">
              <input
                type="date"
                name="operatingPermitExpiry"
                value={formData.operatingPermitExpiry}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Insurance expiry date">
              <input
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleChange}
                className={inputClass}
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
            {isPending ? "Saving…" : "Save changes"}
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