"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, User, Phone, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getOwnerAction, updateOwnerAction } from "../../../actions";
import type { Owner, MembershipStatus } from "@/types";

// ---------------------------------------------------------------------------
// Shared primitives (same as new-owner-page)
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
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
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
// Page
// ---------------------------------------------------------------------------

export default function EditOwnerPage() {
  const params   = useParams();
  const router   = useRouter();
  const tenantId = params.tenantId as string;
  const ownerId  = params.ownerId as string;

  const [isLoading, setIsLoading]    = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors]          = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName:        "",
    lastName:         "",
    email:            "",
    phone:            "",
    idNumber:         "",
    address:          "",
    membershipStatus: "pending" as MembershipStatus,
  });

  useEffect(() => {
    async function fetchOwner() {
      try {
        const result = await getOwnerAction(ownerId);
        if (result.success && result.data) {
          const o = result.data;
          setFormData({
            firstName:        o.firstName,
            lastName:         o.lastName,
            email:            o.email,
            phone:            o.phone,
            idNumber:         o.idNumber,
            address:          o.address,
            membershipStatus: o.membershipStatus,
          });
        } else {
          toast.error(result.error || "Owner not found");
          router.push(`/tenant/${tenantId}/owners`);
        }
      } catch (error) {
        console.error("Error fetching owner:", error);
        toast.error("Failed to load owner data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOwner();
  }, [ownerId, tenantId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim())  e.lastName  = "Last name is required";
    if (!formData.email.trim())     e.email     = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Invalid email address";
    if (!formData.phone.trim())    e.phone    = "Phone number is required";
    if (!formData.idNumber.trim()) e.idNumber = "ID number is required";
    else if (!/^\d{13}$/.test(formData.idNumber.replace(/\s/g, "")))
      e.idNumber = "ID number must be 13 digits";
    if (!formData.address.trim())  e.address  = "Address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await updateOwnerAction(tenantId, ownerId, {
          firstName:        formData.firstName,
          lastName:         formData.lastName,
          email:            formData.email,
          phone:            formData.phone,
          idNumber:         formData.idNumber,
          address:          formData.address,
          membershipStatus: formData.membershipStatus,
        });
        if (result.success) {
          toast.success("Owner updated successfully");
          router.push(`/tenant/${tenantId}/owners/${ownerId}`);
        } else {
          toast.error(result.error || "Failed to update owner");
        }
      } catch (error) {
        console.error("Error updating owner:", error);
        toast.error("Failed to update owner");
      }
    });
  };

  const STATUS_OPTIONS: { value: MembershipStatus; label: string; description: string }[] = [
    { value: "pending",   label: "Pending approval", description: "Awaiting review" },
    { value: "active",    label: "Active",            description: "Full member" },
    { value: "suspended", label: "Suspended",         description: "Access restricted" },
  ];

  const STATUS_ACCENT: Record<MembershipStatus, string> = {
    pending:   "border-blue-500  bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100",
    active:    "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
    suspended: "border-red-500   bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/owners/${ownerId}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit owner</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update owner information and membership status
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">

            <SectionCard title="Personal information" description="Basic details about the taxi owner" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Identity
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="firstName" error={errors.firstName}>
                    <input
                      id="firstName" name="firstName"
                      value={formData.firstName} onChange={handleChange}
                      disabled={isPending}
                      className={cn(inputClass, errors.firstName && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
                    <input
                      id="lastName" name="lastName"
                      value={formData.lastName} onChange={handleChange}
                      disabled={isPending}
                      className={cn(inputClass, errors.lastName && inputErrorClass)}
                    />
                  </Field>
                </div>
                <Field
                  label="South African ID number" htmlFor="idNumber"
                  hint="13-digit South African ID number" error={errors.idNumber}
                >
                  <input
                    id="idNumber" name="idNumber"
                    value={formData.idNumber} onChange={handleChange}
                    maxLength={13} disabled={isPending}
                    className={cn(inputClass, "font-mono tracking-wider", errors.idNumber && inputErrorClass)}
                  />
                </Field>
                <Field label="Physical address" htmlFor="address" error={errors.address}>
                  <textarea
                    id="address" name="address"
                    value={formData.address} onChange={handleChange}
                    rows={3} disabled={isPending}
                    className={cn(inputClass, "resize-none", errors.address && inputErrorClass)}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Contact information" description="How to reach this owner" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> Contact details
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email address" htmlFor="email" error={errors.email}>
                    <input
                      id="email" name="email" type="email"
                      value={formData.email} onChange={handleChange}
                      disabled={isPending}
                      className={cn(inputClass, errors.email && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Phone number" htmlFor="phone" error={errors.phone}>
                    <input
                      id="phone" name="phone" type="tel"
                      value={formData.phone} onChange={handleChange}
                      disabled={isPending}
                      className={cn(inputClass, errors.phone && inputErrorClass)}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            <SectionCard title="Membership" description="Change membership status" accent="green">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" /> Status
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
                      type="radio" name="membershipStatus" value={opt.value}
                      checked={formData.membershipStatus === opt.value}
                      onChange={() => setFormData(prev => ({ ...prev, membershipStatus: opt.value }))}
                      disabled={isPending}
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
                <p className="pt-1 text-xs text-muted-foreground">
                  Changing status affects owner access and reporting
                </p>
              </div>
            </SectionCard>

            <div className="flex flex-col gap-2">
              <button
                type="submit" disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />Save changes</>
                }
              </button>
              <Link
                href={`/tenant/${tenantId}/owners/${ownerId}`}
                className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Link>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}