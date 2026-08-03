/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

export interface AddressComponents {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
}

export interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (components: AddressComponents) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  onBlur,
  placeholder = "Enter your address",
  className,
  disabled,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Google Places script
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    if (!GOOGLE_PLACES_API_KEY) {
      setLoadError("Google Places API key not configured");
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkLoaded), 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places,visualization`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError("Failed to load Google Places");
    };

    document.head.appendChild(script);
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "us" },
          fields: ["address_components", "formatted_address", "place_id", "geometry"],
          types: ["address"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components) return;

        const components = extractAddressComponents(place);
        onAddressSelect(components);
        onChange(components.formattedAddress);
      });
    } catch (err) {
      console.error("Failed to initialize Places Autocomplete:", err);
    }
  }, [isLoaded, onAddressSelect, onChange]);

  const extractAddressComponents = useCallback(
    (place: google.maps.places.PlaceResult): AddressComponents => {
      const getComponent = (type: string, useShort = false): string => {
        const component = place.address_components?.find((c) =>
          c.types.includes(type)
        );
        return useShort ? component?.short_name || "" : component?.long_name || "";
      };

      const streetNumber = getComponent("street_number");
      const route = getComponent("route");
      const streetAddress = [streetNumber, route].filter(Boolean).join(" ");

      return {
        formattedAddress: place.formatted_address || "",
        streetAddress,
        city: getComponent("locality") || getComponent("sublocality"),
        county: getComponent("administrative_area_level_2"),
        state: getComponent("administrative_area_level_1", true),
        zipCode: getComponent("postal_code"),
        placeId: place.place_id || "",
        lat: place.geometry?.location?.lat() ?? null,
        lng: place.geometry?.location?.lng() ?? null,
      };
    },
    []
  );

  if (loadError) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={isLoaded ? placeholder : "Loading..."}
      className={className}
      disabled={disabled || !isLoaded}
    />
  );
}