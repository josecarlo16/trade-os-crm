import { useEffect, useRef, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ZipCodeDataItem {
  zip: string;
  count: number;
  city: string | null;
  isDfw: boolean;
}

interface ScannerHeatmapProps {
  zipCodeData: ZipCodeDataItem[];
  isLoading?: boolean;
}

interface GeocodedLocation {
  zip: string;
  lat: number;
  lng: number;
  count: number;
  city: string | null;
  isDfw: boolean;
}

const DFW_CENTER = { lat: 32.7767, lng: -96.7970 };
const CACHE_KEY = 'geocoded-zip-codes';
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-heatmap';

// Load geocoded zips from localStorage cache
const getGeocodedCache = (): Record<string, { lat: number; lng: number }> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// Save geocoded zips to localStorage cache
const saveGeocodedCache = (cache: Record<string, { lat: number; lng: number }>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache geocoded zips:', e);
  }
};

export function ScannerHeatmap({ zipCodeData, isLoading }: ScannerHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [geocodedLocations, setGeocodedLocations] = useState<GeocodedLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script with visualization library
  useEffect(() => {
    if (window.google?.maps?.visualization) {
      setIsMapLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) || 
                           document.querySelector('script[src*="maps.googleapis.com"]');
    
    if (existingScript) {
      // Check if it has visualization library
      if (!existingScript.getAttribute('src')?.includes('visualization')) {
        // Need to reload with visualization
        existingScript.remove();
      } else {
        const checkLoaded = setInterval(() => {
          if (window.google?.maps?.visualization) {
            setIsMapLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkLoaded);
          if (!window.google?.maps?.visualization) {
            setError('Failed to load Google Maps visualization');
          }
        }, 10000);
        return;
      }
    }

    // Fetch API key from edge function
    const loadMapScript = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-maps-config');
        
        if (fnError || !data?.apiKey) {
          console.error('Failed to get maps config:', fnError);
          setError('Google Maps API key not configured');
          return;
        }

        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=visualization`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          setIsMapLoaded(true);
        };

        script.onerror = () => {
          setError('Failed to load Google Maps');
        };

        document.head.appendChild(script);
      } catch (err) {
        console.error('Failed to load map:', err);
        setError('Failed to initialize map');
      }
    };

    loadMapScript();
  }, []);

  // Geocode zip codes using edge function
  useEffect(() => {
    if (!isMapLoaded || !zipCodeData.length) return;

    const geocodeZips = async () => {
      setIsGeocoding(true);
      const cache = getGeocodedCache();
      const results: GeocodedLocation[] = [];
      const newCache = { ...cache };

      // Separate cached and uncached zip codes
      const uncachedZips: string[] = [];
      
      for (const item of zipCodeData) {
        if (cache[item.zip]) {
          results.push({
            zip: item.zip,
            lat: cache[item.zip].lat,
            lng: cache[item.zip].lng,
            count: item.count,
            city: item.city,
            isDfw: item.isDfw,
          });
        } else {
          uncachedZips.push(item.zip);
        }
      }

      // Geocode uncached zip codes via edge function
      if (uncachedZips.length > 0) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke('geocode-zipcodes', {
            body: { zipCodes: uncachedZips }
          });

          if (fnError) {
            console.error('Geocoding edge function error:', fnError);
          } else if (data?.results) {
            for (const geocoded of data.results) {
              if (geocoded.lat && geocoded.lng && !geocoded.error) {
                newCache[geocoded.zip] = { lat: geocoded.lat, lng: geocoded.lng };
                
                // Find the original item to get count, city, isDfw
                const originalItem = zipCodeData.find(item => item.zip === geocoded.zip);
                if (originalItem) {
                  results.push({
                    zip: geocoded.zip,
                    lat: geocoded.lat,
                    lng: geocoded.lng,
                    count: originalItem.count,
                    city: originalItem.city,
                    isDfw: originalItem.isDfw,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Failed to geocode zip codes:', e);
        }
      }

      saveGeocodedCache(newCache);
      setGeocodedLocations(results);
      setIsGeocoding(false);
    };

    geocodeZips();
  }, [isMapLoaded, zipCodeData]);

  // Initialize map - always show DFW area as default
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: DFW_CENTER,
        zoom: 9,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
    }
  }, [isMapLoaded]);

  // Update heatmap layer when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !geocodedLocations.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Calculate max count for weighting
    const maxCount = Math.max(...geocodedLocations.map(l => l.count), 1);

    // Create heatmap data with weights
    const heatmapData = geocodedLocations.map(loc => ({
      location: new window.google.maps.LatLng(loc.lat, loc.lng),
      weight: loc.count / maxCount * 10,
    }));

    // Remove existing heatmap layer
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
    }

    // Create new heatmap layer
    heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: mapInstanceRef.current,
      radius: 40,
      opacity: 0.7,
      gradient: [
        'rgba(0, 255, 0, 0)',
        'rgba(0, 255, 0, 0.6)',
        'rgba(255, 255, 0, 0.8)',
        'rgba(255, 165, 0, 0.9)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    // Add click markers for top locations
    const topLocations = [...geocodedLocations]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    topLocations.forEach((loc) => {
      const marker = new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: loc.isDfw ? '#10b981' : '#f59e0b',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${loc.zip} - ${loc.count} scans`,
      });

      marker.addListener('click', () => {
        const content = `
          <div style="padding: 8px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
              ${loc.zip} ${loc.city ? `- ${loc.city}` : ''}
            </div>
            <div style="font-size: 13px; color: #666;">
              <strong>${loc.count}</strong> scan${loc.count !== 1 ? 's' : ''}
            </div>
            <div style="margin-top: 4px;">
              <span style="
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                background: ${loc.isDfw ? '#dcfce7' : '#fef3c7'};
                color: ${loc.isDfw ? '#166534' : '#92400e'};
              ">
                ${loc.isDfw ? 'DFW Service Area' : 'Outside Service Area'}
              </span>
            </div>
          </div>
        `;
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

  }, [isMapLoaded, geocodedLocations]);

  // Calculate total scans for legend
  const totalScans = useMemo(() => 
    geocodedLocations.reduce((sum, loc) => sum + loc.count, 0), 
    [geocodedLocations]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-muted/30 rounded-lg border">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Showing data in table format instead
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="h-[400px] w-full rounded-lg border overflow-hidden"
          style={{ minHeight: '400px' }}
        />
        
        {/* Loading overlay */}
        {(isGeocoding || (!isMapLoaded && !error)) && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isGeocoding ? 'Geocoding zip codes...' : 'Loading map...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Activity Level:</span>
          <div className="flex items-center gap-1">
            <div className="h-3 w-16 rounded-sm" style={{
              background: 'linear-gradient(to right, #00ff00, #ffff00, #ffa500, #ff0000)'
            }} />
          </div>
          <span className="text-muted-foreground text-xs">Low → High</span>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500 border border-white" />
            <span className="text-muted-foreground">DFW Area</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500 border border-white" />
            <span className="text-muted-foreground">Outside Area</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
        <span>{geocodedLocations.length} zip codes visualized</span>
        <span>{totalScans} total scans mapped</span>
      </div>
    </div>
  );
}
