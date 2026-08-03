import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";

interface MapPreviewProps {
  lat: number;
  lng: number;
  address: string;
  county?: string;
  className?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export function MapPreview({ lat, lng, address, county, className }: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) {
      setMapError(true);
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 18,
        mapTypeId: "hybrid",
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add marker
      new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        title: address,
      });

      setMap(mapInstance);
      setMapError(false);
    } catch (err) {
      console.error("Failed to initialize map:", err);
      setMapError(true);
    }
  }, [lat, lng, address]);

  // Fallback to static image if interactive map fails
  if (mapError || !GOOGLE_MAPS_API_KEY) {
    const staticMapUrl = GOOGLE_MAPS_API_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=400x200&maptype=hybrid&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      : null;

    return (
      <div className={`rounded-lg border border-border overflow-hidden bg-muted ${className}`}>
        {staticMapUrl ? (
          <img 
            src={staticMapUrl} 
            alt="Property location" 
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 flex items-center justify-center text-muted-foreground">
            <MapPin className="h-8 w-8" />
          </div>
        )}
        <div className="p-3 bg-card">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{address}</p>
              {county && <p className="text-muted-foreground">{county} County</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border overflow-hidden bg-card ${className}`}>
      <div ref={mapRef} className="w-full h-40" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{address}</p>
              {county && <p className="text-muted-foreground">{county} County</p>}
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
