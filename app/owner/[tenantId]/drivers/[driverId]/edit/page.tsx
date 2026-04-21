"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, User, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getOwnerDriversAction, updateOwnerDriverAction } from "../../../actions";
import type { DriverStatus } from "@/types";

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

export default function EditDriverPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const driverId = params.driverId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    status: "active" as DriverStatus,
  });

  useEffect(() => {
    async function fetchDriver() {
      try {
        const result = await getOwnerDriversAction(tenantId);
        if (result.success && result.data) {
          const driver = (result.data.documents ?? []).find(
            (dr: any) => dr.$id === driverId
          );
          if (driver) {
            setFormData({
              firstName: driver.firstName ?? "",
              lastName: driver.lastName ?? "",
              idNumber: driver.idNumber ?? "",
              phone: driver.phone ?? "",
              email: driver.email ?? "",
              address: driver.address ?? "",
              prdpNumber: driver.prdpNumber ?? "",
              prdpExpiry: driver.prdpExpiry ?? "",
              driverLicenseNumber: driver.driverLicenseNumber ?? "",
              driverLicenseExpiry: driver.driverLicenseExpiry ?? "",
              driverLicenseCode: driver.driverLicenseCode ?? "B",
              status: driver.status ?? "active",
            });
          } else {
            setFetchError("Driver not found");
          }
        } else {
          setFetchError(result.error ?? "Failed to load driver");
        }
      } catch {
        setFetchError("Failed to load driver");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDriver();
  }, [tenantId, driverId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateOwnerDriverAction(tenantId, driverId, {
          ...formData,
          status: formData.status as DriverStatus,
        });
        if (result.success) {
          toast.success("Driver updated successfully");
          router.push(`/owner/${tenantId}/drivers/${driverId}`);
        } else {
          toast.error(result.error ?? "Failed to update driver");
        }
      } catch {
        toast.error("Failed to update driver");
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
          href={`/owner/${tenantId}/drivers`}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Back to drivers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/owner/${tenantId}/drivers/${driverId}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit driver</h1>
          <p className="text-sm text-muted-foreground">
            Update driver information.
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
            <Field label="First name">
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="Last name">
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="ID number">
              <input
                name="idNumber"
                value={formData.idNumber}
                className={cn(inputClass(), "opacity-60 cursor-not-allowed")}
                disabled
              />
            </Field>
            <Field label="Phone number">
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                className={inputClass()}
              />
            </Field>
            <Field label="Address">
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
            <Field label="PrDP number">
              <input
                name="prdpNumber"
                value={formData.prdpNumber}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="PrDP expiry">
              <input
                type="date"
                name="prdpExpiry"
                value={formData.prdpExpiry}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="Licence number">
              <input
                name="driverLicenseNumber"
                value={formData.driverLicenseNumber}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="Licence expiry">
              <input
                type="date"
                name="driverLicenseExpiry"
                value={formData.driverLicenseExpiry}
                onChange={handleChange}
                className={inputClass()}
              />
            </Field>
            <Field label="Licence code">
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
            <Field label="Status">
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputClass()}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
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
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <Link href={`/owner/${tenantId}/drivers/${driverId}`}>
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