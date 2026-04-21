"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Ban,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Owner, Vehicle, Fine, MembershipPayment, MembershipStatus } from "@/types";
import {
  getOwnerAction,
  getVehiclesByOwnerAction,
  getFinesByOwnerAction,
  getPaymentsByOwnerAction,
  updateOwnerAction,
} from "../../actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMembershipNumber(owner: Owner): string {
  return owner.idNumber.slice(-6) || owner.$id.slice(-6);
}

function getOutstandingBalance(fines: Fine[], payments: MembershipPayment[]): number {
  const fineTotal    = fines.filter(f => f.status === "pending").reduce((s, f) => s + f.amount, 0);
  const paymentTotal = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  return fineTotal + paymentTotal;
}

function initials(owner: Owner) {
  return `${owner.firstName.charAt(0)}${owner.lastName.charAt(0)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string; label: string }> = {
    active:    { dot: "bg-green-600", pill: "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100", label: "Active" },
    suspended: { dot: "bg-red-600",   pill: "bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100",   label: "Suspended" },
    pending:   { dot: "bg-blue-500",  pill: "bg-blue-50  text-blue-900  dark:bg-blue-950  dark:text-blue-100",  label: "Pending" },
  };
  const s = map[status] ?? { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function MonoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tracking-wider text-foreground">
      {children}
    </span>
  );
}

function StatCard({ label, value, valueClass, icon }: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={cn("text-2xl font-semibold leading-none tabular-nums", valueClass)}>
        {value}
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

const VEHICLE_STRIPE: Record<string, string> = {
  active:      "border-l-[3px] border-l-green-600",
  inactive:    "border-l-[3px] border-l-red-600",
  maintenance: "border-l-[3px] border-l-amber-500",
  pending:     "border-l-[3px] border-l-blue-500",
};

const FINE_STRIPE: Record<string, string> = {
  paid:    "border-l-[3px] border-l-green-600",
  waived:  "border-l-[3px] border-l-muted-foreground",
  pending: "border-l-[3px] border-l-red-600",
};

function FinePill({ status }: { status: string }) {
  const map: Record<string, { dot: string; pill: string }> = {
    paid:    { dot: "bg-green-600", pill: "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100" },
    waived:  { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
    pending: { dot: "bg-red-600",   pill: "bg-red-50   text-red-900   dark:bg-red-950   dark:text-red-100" },
  };
  const s = map[status] ?? { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize", s.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {status}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = "vehicles" | "fines" | "payments";

export default function OwnerDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const tenantId = params.tenantId as string;
  const ownerId  = params.ownerId as string;

  const [owner, setOwner]       = useState<Owner | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fines, setFines]       = useState<Fine[]>([]);
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("vehicles");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [ownerResult, vehiclesResult, finesResult, paymentsResult] = await Promise.all([
          getOwnerAction(ownerId),
          getVehiclesByOwnerAction(ownerId),
          getFinesByOwnerAction(ownerId),
          getPaymentsByOwnerAction(ownerId),
        ]);
        if (ownerResult.success && ownerResult.data) {
          setOwner(ownerResult.data);
        } else {
          toast.error("Owner not found");
          router.push(`/tenant/${tenantId}/owners`);
          return;
        }
        if (vehiclesResult.success && vehiclesResult.data) setVehicles(vehiclesResult.data);
        if (finesResult.success   && finesResult.data)   setFines(finesResult.data);
        if (paymentsResult.success && paymentsResult.data) setPayments(paymentsResult.data);
      } catch (error) {
        console.error("Error fetching owner data:", error);
        toast.error("Failed to load owner data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [ownerId, tenantId, router]);

  const handleStatusChange = (newStatus: "active" | "suspended") => {
    if (!owner) return;
    startTransition(async () => {
      try {
        const result = await updateOwnerAction(tenantId, ownerId, { membershipStatus: newStatus });
        if (result.success && result.data) {
          setOwner(result.data);
          toast.success(`Membership ${newStatus === "active" ? "activated" : "suspended"}`);
        } else {
          toast.error(result.error || "Failed to update status");
        }
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    });
  };

  if (isLoading) return <PageSkeleton />;
  if (!owner)    return null;

  const outstandingBalance = getOutstandingBalance(fines, payments);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "vehicles", label: "Vehicles",  count: vehicles.length },
    { key: "fines",    label: "Fines",     count: fines.length },
    { key: "payments", label: "Payments",  count: payments.length },
  ];

  const STRIPE: Record<MembershipStatus, string> = {
    active:    "border-l-[3px] border-l-green-600",
    suspended: "border-l-[3px] border-l-red-600",
    pending:   "border-l-[3px] border-l-blue-500",
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/tenant/${tenantId}/owners`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {initials(owner)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {owner.firstName} {owner.lastName}
              </h1>
              <StatusPill status={owner.membershipStatus} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              MBR-{getMembershipNumber(owner)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/tenant/${tenantId}/owners/${ownerId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <MoreHorizontal className="h-4 w-4" />
                }
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {owner.membershipStatus === "active" ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleStatusChange("suspended")}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend membership
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate membership
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vehicles"
          value={vehicles.length}
          icon={<Car className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Outstanding balance"
          value={`R ${outstandingBalance.toLocaleString()}`}
          valueClass={outstandingBalance > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}
          icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Total fines"
          value={fines.length}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Member since"
          value={new Date(owner.joinedAt).toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}
          icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Contact card */}
        <div className={cn(
          "overflow-hidden rounded-xl border bg-card lg:col-span-1",
          STRIPE[owner.membershipStatus as MembershipStatus] ?? "border-l-[3px] border-l-transparent"
        )}>
          <div className="border-b px-5 py-4">
            <p className="text-sm font-medium">Contact information</p>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4">
            <ContactRow
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              label="Phone"
              value={owner.phone}
            />
            <ContactRow
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              label="Email"
              value={owner.email}
            />
            <ContactRow
              icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
              label="Address"
              value={owner.address}
            />

            <div className="my-1 border-t border-border" />

            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">ID number</p>
              <MonoPill>{owner.idNumber}</MonoPill>
            </div>
          </div>
        </div>

        {/* Tab card */}
        <div className="overflow-hidden rounded-xl border bg-card lg:col-span-2">

          {/* Tab bar */}
          <div className="flex border-b bg-muted/40">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm transition-colors",
                  activeTab === tab.key
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  activeTab === tab.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Vehicles tab */}
          {activeTab === "vehicles" && (
            vehicles.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No vehicles registered for this owner.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Registration", "Vehicle", "Permit expiry", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicles.map(vehicle => (
                    <tr
                      key={vehicle.$id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        VEHICLE_STRIPE[vehicle.status] ?? "border-l-[3px] border-l-transparent"
                      )}
                    >
                      <td className="px-4 py-3 pl-5">
                        <MonoPill>{vehicle.registrationNumber}</MonoPill>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {vehicle.make} {vehicle.model}
                        <span className="ml-1 text-muted-foreground">({vehicle.year})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(vehicle.operatingPermitExpiry).toLocaleDateString("en-ZA")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={vehicle.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* Fines tab */}
          {activeTab === "fines" && (
            fines.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No fines recorded for this owner.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Type", "Amount", "Issued", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fines.map(fine => (
                    <tr
                      key={fine.$id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        FINE_STRIPE[fine.status] ?? "border-l-[3px] border-l-transparent"
                      )}
                    >
                      <td className="px-4 py-3 pl-5 capitalize text-sm">
                        {fine.type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <MonoPill>R {fine.amount.toLocaleString()}</MonoPill>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(fine.issuedAt).toLocaleDateString("en-ZA")}
                      </td>
                      <td className="px-4 py-3">
                        <FinePill status={fine.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* Payments tab */}
          {activeTab === "payments" && (
            payments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No payment history for this owner.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Date", "Period", "Amount", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(payment => (
                    <tr
                      key={payment.$id}
                      className="border-l-[3px] border-l-green-600 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 pl-5 text-sm text-muted-foreground">
                        {new Date(payment.paidAt || payment.createdAt).toLocaleDateString("en-ZA")}
                      </td>
                      <td className="px-4 py-3 text-sm">{payment.period}</td>
                      <td className="px-4 py-3">
                        <MonoPill>R {payment.amount.toLocaleString()}</MonoPill>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

        </div>
      </div>
    </div>
  );
}