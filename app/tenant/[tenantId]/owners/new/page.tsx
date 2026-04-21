"use client"

import { useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, User, Phone, Shield } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createOwnerAction } from "../../actions"
import type { MembershipStatus } from "@/types"

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
  accent,
}: {
  title: string
  description?: string
  children: React.ReactNode
  accent?: "blue" | "green" | "amber"
}) {
  const stripe = {
    blue:  "border-l-[3px] border-l-blue-500",
    green: "border-l-[3px] border-l-green-600",
    amber: "border-l-[3px] border-l-amber-500",
  }
  return (
    <div className={cn(
      "overflow-hidden rounded-xl border bg-card",
      accent ? stripe[accent] : "border-l-[3px] border-l-transparent"
    )}>
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

const inputClass = [
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
  "placeholder:text-muted-foreground",
  "focus:outline-none focus:ring-1 focus:ring-ring",
  "disabled:opacity-50",
].join(" ")

const inputErrorClass = "border-red-500 focus:ring-red-500"

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewOwnerPage() {
  const params   = useParams()
  const router   = useRouter()
  const tenantId = params.tenantId as string

  const [isPending, startTransition] = useTransition()
  const [errors, setErrors]          = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    firstName:        "",
    lastName:         "",
    email:            "",
    phone:            "",
    idNumber:         "",
    address:          "",
    membershipStatus: "pending" as MembershipStatus,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.firstName.trim()) e.firstName = "First name is required"
    if (!formData.lastName.trim())  e.lastName  = "Last name is required"
    if (!formData.email.trim())     e.email     = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Invalid email address"
    if (!formData.phone.trim())     e.phone    = "Phone number is required"
    if (!formData.idNumber.trim())  e.idNumber = "ID number is required"
    else if (!/^\d{13}$/.test(formData.idNumber.replace(/\s/g, "")))
      e.idNumber = "ID number must be 13 digits"
    if (!formData.address.trim())   e.address  = "Address is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      try {
        const result = await createOwnerAction(tenantId, {
          firstName: formData.firstName,
          lastName:  formData.lastName,
          email:     formData.email,
          phone:     formData.phone,
          idNumber:  formData.idNumber,
          address:   formData.address,
        })
        if (result.success) {
          toast.success("Owner created successfully")
          router.push(`/tenant/${tenantId}/owners`)
        } else {
          toast.error(result.error || "Failed to create owner")
        }
      } catch (error) {
        console.error("Failed to create owner:", error)
        toast.error("Failed to create owner")
      }
    })
  }

  const STATUS_OPTIONS: { value: MembershipStatus; label: string; description: string }[] = [
    { value: "pending",   label: "Pending approval", description: "Awaiting review" },
    { value: "active",    label: "Active",            description: "Full member" },
    { value: "suspended", label: "Suspended",         description: "Access restricted" },
  ]

  const STATUS_ACCENT: Record<MembershipStatus, string> = {
    pending:   "border-blue-500  bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100",
    active:    "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
    suspended: "border-red-500   bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/owners`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add new owner</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Register a new taxi owner to your association
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ---- Main column ---- */}
          <div className="space-y-5 lg:col-span-2">

            {/* Personal information */}
            <SectionCard
              title="Personal information"
              description="Basic details about the taxi owner"
              accent="blue"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Identity
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="firstName" error={errors.firstName}>
                    <input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Thabo"
                      className={cn(inputClass, errors.firstName && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
                    <input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Mbeki"
                      className={cn(inputClass, errors.lastName && inputErrorClass)}
                    />
                  </Field>
                </div>

                <Field
                  label="South African ID number"
                  htmlFor="idNumber"
                  hint="13-digit South African ID number"
                  error={errors.idNumber}
                >
                  <input
                    id="idNumber"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    placeholder="e.g. 8501015800083"
                    maxLength={13}
                    className={cn(inputClass, "font-mono tracking-wider", errors.idNumber && inputErrorClass)}
                  />
                </Field>

                <Field label="Physical address" htmlFor="address" error={errors.address}>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. 123 Vilakazi Street, Soweto, Gauteng"
                    rows={3}
                    className={cn(inputClass, "resize-none", errors.address && inputErrorClass)}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* Contact information */}
            <SectionCard
              title="Contact information"
              description="How to reach this owner"
              accent="blue"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Contact details
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email address" htmlFor="email" error={errors.email}>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. thabo@email.co.za"
                      className={cn(inputClass, errors.email && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Phone number" htmlFor="phone" error={errors.phone}>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +27 82 123 4567"
                      className={cn(inputClass, errors.phone && inputErrorClass)}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ---- Sidebar ---- */}
          <div className="space-y-5">

            {/* Membership status */}
            <SectionCard
              title="Membership"
              description="Set the initial membership status"
              accent="green"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Status
                </div>

                {STATUS_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                      formData.membershipStatus === opt.value
                        ? cn("border", STATUS_ACCENT[opt.value])
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="membershipStatus"
                      value={opt.value}
                      checked={formData.membershipStatus === opt.value}
                      onChange={() => setFormData(prev => ({ ...prev, membershipStatus: opt.value }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      opt.value === "pending"   && "bg-blue-500",
                      opt.value === "active"    && "bg-green-600",
                      opt.value === "suspended" && "bg-red-500",
                    )} />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </label>
                ))}

                <p className="text-xs text-muted-foreground pt-1">
                  New owners are typically set to pending until approved
                </p>
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create owner
                  </>
                )}
              </button>
              <Link
                href={`/tenant/${tenantId}/owners`}
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
