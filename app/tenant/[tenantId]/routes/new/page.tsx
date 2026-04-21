"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, MapPin, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createRouteAction } from "../../actions";
import type { RouteStatus, RouteStop } from "@/types";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { StopManager } from "@/components/StopManager";


// ---------------------------------------------------------------------------
// Shared primitives (same as before)
// ---------------------------------------------------------------------------

function SectionCard({ title, description, children, accent }: { title: string; description?: string; children: React.ReactNode; accent?: "blue" | "green" | "amber" }) {
  const stripe = {
    blue: "border-l-[3px] border-l-blue-500",
    green: "border-l-[3px] border-l-green-600",
    amber: "border-l-[3px] border-l-amber-500",
  };
  return (
    <div className={cn("rounded-xl border bg-card", accent ? stripe[accent] : "border-l-[3px] border-l-transparent")}>
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, htmlFor, hint, error, optional, children }: { label: string; htmlFor?: string; hint?: string; error?: string; optional?: boolean; children: React.ReactNode }) {
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

const STATUS_OPTIONS: { value: RouteStatus; label: string; description: string }[] = [
  { value: "active", label: "Active", description: "Open for vehicle assignment" },
  { value: "inactive", label: "Inactive", description: "Not currently in service" },
];

const STATUS_ACCENT: Record<RouteStatus, string> = {
  active: "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  inactive: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
};

const STATUS_DOT: Record<RouteStatus, string> = {
  active: "bg-green-600",
  inactive: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Places autocomplete input (unchanged)
// ---------------------------------------------------------------------------

interface PlaceValue {
  address: string;
  lat: number;
  lng: number;
}

function PlacesInput({ id, placeholder, error, dotColor, onChange }: { id?: string; placeholder: string; error?: string; dotColor?: string; onChange: (val: PlaceValue) => void }) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: "za" } },
    debounce: 300,
    scriptUrl: `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`,
  } as any);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onChange({ address: description, lat, lng });
    } catch {
      onChange({ address: description, lat: 0, lng: 0 });
    }
  };

  return (
    <div className="relative z-10">
      <div className="relative">
        {dotColor && <span className={cn("absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full shrink-0", dotColor)} />}
        <input
          id={id}
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange({ address: e.target.value, lat: 0, lng: 0 });
          }}
          disabled={!ready}
          placeholder={placeholder}
          className={cn(inputClass, dotColor && "pl-7", error && inputErrorClass)}
        />
      </div>
      {status === "OK" && data.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-md">
          {data.map(({ place_id, description }) => (
            <li key={place_id} onMouseDown={() => handleSelect(description)} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewRoutePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    origin: { address: "", lat: 0, lng: 0 },
    destination: { address: "", lat: 0, lng: 0 },
    distance: "",
    baseFare: "",
    maxVehicles: "",
    status: "active" as RouteStatus,
    stops: [] as RouteStop[], // added
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.code) e.code = "Route code is required";
    if (!formData.name) e.name = "Route name is required";
    if (!formData.origin.address) e.origin = "Origin is required";
    if (!formData.destination.address) e.destination = "Destination is required";
    if (!formData.distance) e.distance = "Distance is required";
    if (!formData.baseFare) e.baseFare = "Fare is required";
    if (!formData.maxVehicles) e.maxVehicles = "Max vehicles is required";

    const baseFareNum = parseFloat(formData.baseFare);
    // Validate stops fare progression
    let prevFare = 0;
    for (let i = 0; i < formData.stops.length; i++) {
      const stop = formData.stops[i];
      if (stop.fareFromOrigin <= prevFare) {
        e.stops = `Stop ${i + 1} fare must be greater than previous stop's fare (R${prevFare.toFixed(2)})`;
        break;
      }
      if (stop.fareFromOrigin >= baseFareNum) {
        e.stops = `Stop ${i + 1} fare must be less than destination fare (R${baseFareNum.toFixed(2)})`;
        break;
      }
      prevFare = stop.fareFromOrigin;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const result = await createRouteAction(tenantId, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          origin: formData.origin.address,
          destination: formData.destination.address,
          originLat: formData.origin.lat,
          originLng: formData.origin.lng,
          destinationLat: formData.destination.lat,
          destinationLng: formData.destination.lng,
          distance: parseFloat(formData.distance),
          baseFare: parseFloat(formData.baseFare),
          maxVehicles: parseInt(formData.maxVehicles),
          stops: formData.stops, // submit stops array
        });
        if (result.success) {
          toast.success("Route created");
          router.push(`/tenant/${tenantId}/routes`);
        } else {
          toast.error(result.error || "Failed to create route");
        }
      } catch {
        toast.error("Failed to create route");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/tenant/${tenantId}/routes`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add new route</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Create a new taxi route for your association</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Route information */}
            <SectionCard title="Route information" description="Identity and endpoints" accent="blue">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <RouteIcon className="h-3.5 w-3.5" /> Identity
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Route code" htmlFor="code" hint="Short identifier, e.g. A1" error={errors.code}>
                    <input
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="e.g. A1"
                      className={cn(inputClass, "font-mono tracking-wider uppercase", errors.code && inputErrorClass)}
                    />
                  </Field>
                  <Field label="Route name" htmlFor="name" error={errors.name}>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Soweto – Johannesburg CBD"
                      className={cn(inputClass, errors.name && inputErrorClass)}
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Endpoints
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Origin" htmlFor="origin" error={errors.origin}>
                    <PlacesInput
                      id="origin"
                      placeholder="e.g. Bara Taxi Rank, Soweto"
                      error={errors.origin}
                      dotColor="bg-green-600"
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, origin: val }));
                        if (errors.origin) setErrors((prev) => ({ ...prev, origin: "" }));
                      }}
                    />
                  </Field>
                  <Field label="Destination" htmlFor="destination" error={errors.destination}>
                    <PlacesInput
                      id="destination"
                      placeholder="e.g. Gandhi Square, JHB CBD"
                      error={errors.destination}
                      dotColor="bg-red-600"
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, destination: val }));
                        if (errors.destination) setErrors((prev) => ({ ...prev, destination: "" }));
                      }}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Route details */}
            <SectionCard title="Route details" description="Distance, fare, and capacity" accent="blue">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Distance (km)" htmlFor="distance" error={errors.distance}>
                  <input
                    id="distance"
                    name="distance"
                    type="number"
                    step="0.1"
                    value={formData.distance}
                    onChange={handleChange}
                    placeholder="e.g. 18.5"
                    className={cn(inputClass, errors.distance && inputErrorClass)}
                  />
                </Field>
                <Field label="Fare (R)" htmlFor="baseFare" error={errors.baseFare}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground">R</span>
                    <input
                      id="baseFare"
                      name="baseFare"
                      type="number"
                      step="0.50"
                      value={formData.baseFare}
                      onChange={handleChange}
                      placeholder="18"
                      className={cn(inputClass, "pl-6 font-mono", errors.baseFare && inputErrorClass)}
                    />
                  </div>
                </Field>
                <Field label="Max vehicles" htmlFor="maxVehicles" error={errors.maxVehicles}>
                  <input
                    id="maxVehicles"
                    name="maxVehicles"
                    type="number"
                    value={formData.maxVehicles}
                    onChange={handleChange}
                    placeholder="e.g. 15"
                    className={cn(inputClass, "font-mono", errors.maxVehicles && inputErrorClass)}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* NEW: Stops section (optional) */}
            <SectionCard title="Intermediate Stops (Optional)" description="Pick‑up and drop‑off points along the route" accent="blue">
              <StopManager
                stops={formData.stops}
                onChange={(newStops) => setFormData((prev) => ({ ...prev, stops: newStops }))}
                destinationFare={parseFloat(formData.baseFare) || 0}
                originAddress={formData.origin.address}
                destinationAddress={formData.destination.address}
              />
              {errors.stops && <p className="mt-2 text-xs font-medium text-red-600">{errors.stops}</p>}
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Status */}
            <SectionCard title="Status" description="Set the initial route status" accent="green">
              <div className="flex flex-col gap-3">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                      formData.status === opt.value ? cn("border", STATUS_ACCENT[opt.value]) : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={formData.status === opt.value}
                      onChange={() => setFormData((prev) => ({ ...prev, status: opt.value }))}
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
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><Save className="h-4 w-4" />Create route</>}
              </button>
              <Link
                href={`/tenant/${tenantId}/routes`}
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