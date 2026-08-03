import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface LocationMapEmbedProps {
  latitude: number;
  longitude: number;
  address: string;
  zoom?: number;
}

export function LocationMapEmbed({ latitude, longitude, address, zoom = 15 }: LocationMapEmbedProps) {
  // Using Google Maps Embed API for static map
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}&zoom=${zoom}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Location Map
          </div>
          
          <div className="relative w-full h-64 rounded-md overflow-hidden border">
            <iframe
              title="Location Map"
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Open in Google Maps →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
