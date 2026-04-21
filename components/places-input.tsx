"use client";

import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacesInputProps {
  id?: string;
  placeholder: string;
  error?: string;
  dotColor?: string;
  value?: string;
  onChange: (val: { address: string; lat: number; lng: number }) => void;
}

export function PlacesInput({
  id,
  placeholder,
  error,
  dotColor,
  value: externalValue,
  onChange,
}: PlacesInputProps) {
  const {
    ready,
    value: internalValue,
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

  const inputValue = externalValue !== undefined ? externalValue : internalValue;

  return (
    <div className="relative z-10">
      <div className="relative">
        {dotColor && (
          <span className={cn("absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full shrink-0", dotColor)} />
        )}
        <input
          id={id}
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange({ address: e.target.value, lat: 0, lng: 0 });
          }}
          disabled={!ready}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50",
            dotColor && "pl-7",
            error && "border-red-500 focus:ring-red-500"
          )}
        />
      </div>
      {status === "OK" && data.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-md">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onMouseDown={() => handleSelect(description)}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            >
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}