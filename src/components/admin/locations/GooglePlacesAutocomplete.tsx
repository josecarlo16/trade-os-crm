import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (placeDetails: {
    place_id: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    address_line1?: string;
    city?: string;
    county?: string;
    state?: string;
    zip_code?: string;
  }) => void;
}

export function GooglePlacesAutocomplete({ onPlaceSelected }: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
      types: ['address'],
    });

    // Listen for place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (!place || !place.geometry) {
        console.error('No place details available');
        return;
      }

      // Extract address components
      let streetNumber = '';
      let route = '';
      let city = '';
      let county = '';
      let state = '';
      let zipCode = '';

      if (place.address_components) {
        place.address_components.forEach(component => {
          const types = component.types;
          
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_2')) {
            county = component.long_name.replace(' County', '');
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
          if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        });
      }

      const addressLine1 = `${streetNumber} ${route}`.trim();

      onPlaceSelected({
        place_id: place.place_id || '',
        formatted_address: place.formatted_address || '',
        latitude: place.geometry.location?.lat() || 0,
        longitude: place.geometry.location?.lng() || 0,
        address_line1: addressLine1,
        city,
        county,
        state,
        zip_code: zipCode,
      });
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onPlaceSelected]);

  return (
    <div className="space-y-2">
      <Label htmlFor="address_search">Search Address (Google Places)</Label>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="address_search"
          placeholder="Start typing an address..."
          className="pl-9"
          disabled={!isLoaded}
        />
      </div>
      {!isLoaded && (
        <p className="text-xs text-muted-foreground">Loading Google Maps...</p>
      )}
    </div>
  );
}
