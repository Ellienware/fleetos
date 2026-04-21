"use client"

import { useState, useEffect, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, Car, FileCheck, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Owner, VehicleStatus } from "@/types"
import { getOwnersAction, createVehicleAction } from "../../actions"

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
  accent,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: "blue" | "green" | "amber";
}) {
  const stripe = {
    blue:  "border-l-[3px] border-l-blue-500",
    green: "border-l-[3px] border-l-green-600",
    amber: "border-l-[3px] border-l-amber-500",
  };
  return (
    <div className={cn(
      "overflow-hidden rounded-xl border bg-card",
      accent ? stripe[accent] : "border-l-[3px] border-l-transparent"
    )}>
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputClass = [
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
  "disabled:opacity-50",
].join(" ");

const inputErrorClass = "border-red-500 focus:ring-red-500";

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: VehicleStatus; label: string; description: string }[] = [
  { value: "active",      label: "Active",      description: "Ready for assignment" },
  { value: "maintenance", label: "Maintenance", description: "Under servicing" },
  { value: "inactive",    label: "Inactive",    description: "Not in service" },
];

const STATUS_ACCENT: Record<VehicleStatus, string> = {
  active:      "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  maintenance: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  inactive:    "border-red-500   bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",
  pending:     "border-blue-500  bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100",
};

const STATUS_DOT: Record<VehicleStatus, string> = {
  active:      "bg-green-600",
  maintenance: "bg-amber-500",
  inactive:    "bg-red-500",
  pending:     "bg-blue-500",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewVehiclePage() {
  const params   = useParams()
  const router   = useRouter()
  const tenantId = params.tenantId as string

  const [isPending, startTransition] = useTransition()
  const [errors, setErrors]          = useState<Record<string, string>>({})
  const [owners, setOwners]          = useState<Owner[]>([])
  const [isLoadingOwners, setIsLoadingOwners] = useState(true)

  const [formData, setFormData] = useState({
    ownerId:                "",
    registrationNumber:     "",
    make:                   "",
    model:                  "",
    year:                   "",
    capacity:               "15",           // renamed from seatingCapacity
    operatingPermitNumber:  "",
    operatingPermitExpiry:  "",
    insuranceExpiry:        "",
    status:                 "active" as VehicleStatus,
  })

  useEffect(() => {
    async function fetchOwners() {
      setIsLoadingOwners(true)
      try {
        const result = await getOwnersAction(tenantId, 1, 100, "active")
        if (result.success && result.data) setOwners(result.data.documents)
      } catch (error) {
        console.error("Error fetching owners:", error)
        toast.error("Failed to load owners")
      } finally {
        setIsLoadingOwners(false)
      }
    }
    fetchOwners()
  }, [tenantId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.ownerId)                            e.ownerId               = "Owner is required"
    if (!formData.registrationNumber.trim())          e.registrationNumber    = "Registration number is required"
    if (!formData.make.trim())                        e.make                  = "Make is required"
    if (!formData.model.trim())                       e.model                 = "Model is required"
    if (!formData.year || parseInt(formData.year) < 1990)
      e.year = "Valid year is required"
    if (!formData.capacity || parseInt(formData.capacity) <= 0)
      e.capacity = "Valid seating capacity is required"
    if (!formData.operatingPermitExpiry)              e.operatingPermitExpiry = "Permit expiry is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      try {
        const result = await createVehicleAction(tenantId, {
          ownerId:                formData.ownerId,
          registrationNumber:     formData.registrationNumber,
          make:                   formData.make,
          model:                  formData.model,
          year:                   parseInt(formData.year),
          capacity:               parseInt(formData.capacity),
          operatingPermitNumber:  formData.operatingPermitNumber || "",   // empty string if missing
          operatingPermitExpiry:  new Date(formData.operatingPermitExpiry).toISOString(),
          insuranceExpiry:        formData.insuranceExpiry ? new Date(formData.insuranceExpiry).toISOString() : "",
        })
        if (result.success) {
          toast.success("Vehicle added successfully")
          router.push(`/tenant/${tenantId}/vehicles`)
        } else {
          toast.error(result.error || "Failed to add vehicle")
        }
      } catch (error) {
        console.error("Failed to create vehicle:", error)
        toast.error("Failed to add vehicle")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/vehicles`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add new vehicle</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Register a new taxi to the fleet</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            {/* Owner assignment */}
            <SectionCard title="Owner assignment" description="Select the owner of this vehicle" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Assign to owner
                </div>
                <Field label="Owner" htmlFor="ownerId" error={errors.ownerId}>
                  {isLoadingOwners ? (
                    <Skeleton className="h-10 w-full rounded-md" />
                  ) : (
                    <select
                      id="ownerId"
                      value={formData.ownerId}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, ownerId: e.target.value }))
                        if (errors.ownerId) setErrors(prev => ({ ...prev, ownerId: "" }))
                      }}
                      className={cn(inputClass, errors.ownerId && inputErrorClass)}
                    >
                      <option value="">Select owner…</option>
                      {owners.length === 0 ? (
                        <option disabled>No active owners found</option>
                      ) : (
                        owners.map(owner => (
                          <option key={owner.$id} value={owner.$id}>
                            {owner.firstName} {owner.lastName}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </Field>
              </div>
            </SectionCard>

            {/* Vehicle information */}
            <SectionCard title="Vehicle information" description="Basic details about the vehicle" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> Identity
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Registration number" htmlFor="registrationNumber" error={errors.registrationNumber}>
                    <input
                      id="registrationNumber" name="registrationNumber"
                      value={formData.registrationNumber} onChange={handleChange}
                      placeholder="e.g. GP 123 ABC"
                      className={cn(inputClass, "font-mono tracking-wider uppercase", errors.registrationNumber && inputErrorClass)}
                    />
                  </Field>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Capacity</label>
                    <input
                      id="capacity" name="capacity" type="number"
                      value={formData.capacity} onChange={handleChange}
                      placeholder="e.g. 15"
                      className={cn(inputClass, errors.capacity && inputErrorClass)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Make" htmlFor="make" error={errors.make}>
                    <input
                      id="make" name="make"
                      value={formData.make} onChange={handleChange}
                      placeholder="e.g. Toyota"
                      className={cn(inputClass, errors.make && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Model" htmlFor="model" error={errors.model}>
                    <input
                      id="model" name="model"
                      value={formData.model} onChange={handleChange}
                      placeholder="e.g. Quantum"
                      className={cn(inputClass, errors.model && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Year" htmlFor="year" error={errors.year}>
                    <input
                      id="year" name="year" type="number"
                      value={formData.year} onChange={handleChange}
                      placeholder="e.g. 2022"
                      className={cn(inputClass, errors.year && inputErrorClass)}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Compliance documents */}
            <SectionCard title="Compliance documents" description="Permit and insurance expiry dates" accent="amber">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileCheck className="h-3.5 w-3.5" /> Expiry dates
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Operating permit number" htmlFor="operatingPermitNumber" optional>
                    <input
                      id="operatingPermitNumber" name="operatingPermitNumber"
                      value={formData.operatingPermitNumber} onChange={handleChange}
                      placeholder="e.g. OL-2024-001"
                      className={cn(inputClass, "font-mono text-xs tracking-wider")}
                    />
                  </Field>
                  <Field label="Permit expiry date" htmlFor="operatingPermitExpiry" error={errors.operatingPermitExpiry}>
                    <input
                      id="operatingPermitExpiry" name="operatingPermitExpiry"
                      type="date" value={formData.operatingPermitExpiry} onChange={handleChange}
                      className={cn(inputClass, errors.operatingPermitExpiry && inputErrorClass)}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Insurance expiry" htmlFor="insuranceExpiry" optional>
                    <input
                      id="insuranceExpiry" name="insuranceExpiry"
                      type="date" value={formData.insuranceExpiry} onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Vehicle status */}
            <SectionCard title="Status" description="Set the initial vehicle status" accent="green">
              <div className="flex flex-col gap-3">
                {STATUS_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                      formData.status === opt.value
                        ? cn("border", STATUS_ACCENT[opt.value])
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio" name="status" value={opt.value}
                      checked={formData.status === opt.value}
                      onChange={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                      className="sr-only"
                    />
                    <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[opt.value])} />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit" disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</>
                  : <><Save className="h-4 w-4" />Add vehicle</>
                }
              </button>
              <Link
                href={`/tenant/${tenantId}/vehicles`}
                className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Link>
            </div>

          </div>
        </div>
      </form>
    </div>
  )
}