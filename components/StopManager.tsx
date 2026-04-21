"use client";

import { useState } from "react";
import { GripVertical, Trash2, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

import type { RouteStop } from "@/types";
import { PlacesInput } from "./places-input";

type PlaceValue = { address: string; lat: number; lng: number };

interface StopManagerProps {
  stops: RouteStop[];
  onChange: (stops: RouteStop[]) => void;
  destinationFare: number;
  originAddress?: string;
  destinationAddress?: string;
}

export function StopManager({
  stops,
  onChange,
  destinationFare,
  originAddress,
  destinationAddress,
}: StopManagerProps) {
  const [nextId, setNextId] = useState(() => {
    const maxId = stops.reduce((max, s) => {
      const idNum = s.id ? parseInt(s.id) : 0;
      return Math.max(max, idNum);
    }, 0);
    return maxId + 1;
  });

  const addStop = () => {
    const newOrder = stops.length;
    const prevFare = stops.length > 0 ? stops[stops.length-1].fareFromOrigin : 0;
    const suggestedFare = Math.min(destinationFare, prevFare + (destinationFare - prevFare) / 2);
    const newStop: RouteStop = {
      id: String(nextId),
      name: "",
      address: "",
      lat: 0,
      lng: 0,
      order: newOrder,
      fareFromOrigin: Math.round(suggestedFare * 100) / 100,
    };
    onChange([...stops, newStop]);
    setNextId(nextId + 1);
  };

  const updateStop = (index: number, updates: Partial<RouteStop>) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], ...updates };
    if (updates.order !== undefined && updates.order !== index) {
      const moved = newStops.splice(index, 1)[0];
      newStops.splice(updates.order, 0, moved);
      newStops.forEach((s, i) => s.order = i);
    }
    onChange(newStops);
  };

  const removeStop = (index: number) => {
    const newStops = stops.filter((_, i) => i !== index);
    newStops.forEach((s, i) => s.order = i);
    onChange(newStops);
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stops.length) return;
    const newStops = [...stops];
    [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
    newStops.forEach((s, i) => s.order = i);
    onChange(newStops);
  };

  return (
    <div className="space-y-4">
      {stops.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          No stops added. Click “Add stop” to define pick‑up/drop‑off points along the route.
        </div>
      )}

      {stops.map((stop, idx) => {
        const prevFare = idx === 0 ? 0 : stops[idx-1].fareFromOrigin;
        const isValidFare = stop.fareFromOrigin > prevFare && stop.fareFromOrigin < destinationFare;
        return (
          <div key={stop.id || idx} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="cursor-grab pt-2"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <PlacesInput
                      placeholder="Stop address, e.g. Maponya Mall"
                      value={stop.address}
                      onChange={(val: PlaceValue) => updateStop(idx, { address: val.address, lat: val.lat, lng: val.lng })}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Stop name (optional)"
                      value={stop.name}
                      onChange={(e) => updateStop(idx, { name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R</span>
                    <input
                      type="number"
                      step="0.50"
                      value={stop.fareFromOrigin}
                      onChange={(e) => updateStop(idx, { fareFromOrigin: parseFloat(e.target.value) || 0 })}
                      className={cn(
                        "w-full rounded-md border bg-background py-2 pl-7 pr-3 text-sm",
                        !isValidFare && "border-red-500 focus:ring-red-500"
                      )}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'down')}
                      disabled={idx === stops.length - 1}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStop(idx)}
                      className="rounded p-1 text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {!isValidFare && (
                  <p className="text-xs text-red-600">
                    Fare must be greater than {prevFare.toFixed(2)} and less than destination fare ({destinationFare.toFixed(2)})
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addStop}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
      >
        + Add stop
      </button>

      <div className="text-xs text-muted-foreground">
        <MapPin className="mr-1 inline h-3 w-3" />
        Origin: {originAddress || "—"} (R0) → Destination: {destinationAddress || "—"} (R{destinationFare})
      </div>
    </div>
  );
}