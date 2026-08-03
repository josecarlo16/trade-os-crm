import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, MapPin, Navigation } from 'lucide-react';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ViewMode = 'jobs' | 'service' | 'installs' | 'appointments';

const OPEN_STAGE_TYPES = new Set(['initial', 'in_progress', 'review']);
const isJobView = (v: ViewMode) => v === 'jobs' || v === 'service' || v === 'installs';

const DFW_CENTER = { lat: 32.85, lng: -97.05 };
const NAVY = '#1e3a5f';
const GOLD = '#d4a84b';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high: '#f97316',
  normal: NAVY,
  low: '#6b7280',
};

const TEAM_PALETTE = [
  '#1e3a5f', '#d4a84b', '#0891b2', '#9333ea', '#16a34a',
  '#db2777', '#0d9488', '#ca8a04', '#7c3aed', '#dc2626',
];

// Lazy-load Google Maps JS API once
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function svgMarkerIcon(color: string) {
  // Teardrop pin — only M/C/Z commands. Google Maps Symbol path does NOT accept
  // SVG arc ('a') commands, so we approximate the circle/teardrop with cubics.
  return {
    path: 'M0,0 C-6,-12 -10,-16 -10,-22 C-10,-28 -4,-32 0,-32 C4,-32 10,-28 10,-22 C10,-16 6,-12 0,0 Z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    scale: 1,
    anchor: new google.maps.Point(0, 0),
  } as google.maps.Symbol;
}

interface JobRow {
  id: string;
  job_number: string | null;
  title: string | null;
  priority: string | null;
  customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null;
  location: { id: string; address_line1: string; city: string; state: string; zip_code: string; latitude: number | null; longitude: number | null } | null;
  stage: { name: string | null; stage_type: string | null; color: string | null } | null;
  job_type: { name: string | null; slug?: string | null } | null;
}

interface AppointmentRow {
  id: string;
  title: string | null;
  start_datetime: string;
  end_datetime: string;
  assigned_team_id: string | null;
  team: { id: string; name: string | null; color: string | null } | null;
  job: {
    id: string;
    job_number: string | null;
    customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null;
    location: { id: string; address_line1: string; city: string; state: string; zip_code: string; latitude: number | null; longitude: number | null } | null;
  } | null;
}

function customerName(c: { first_name: string | null; last_name: string | null; company_name: string | null } | null | undefined): string {
  if (!c) return 'Unknown';
  return c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
}

function formatAddress(loc: { address_line1: string; city: string; state: string; zip_code: string } | null | undefined): string {
  if (!loc) return '';
  return `${loc.address_line1}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
}

// CST date range for a given selected date (America/Chicago)
function cstDayRange(date: Date) {
  // Build YYYY-MM-DD in CST then bracket [00:00, 24:00) CST in UTC
  const tz = 'America/Chicago';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  const ymd = `${get('year')}-${get('month')}-${get('day')}`;
  // CST is UTC-6, CDT UTC-5. Use a robust way: parse with offset from formatToParts.
  const offsetMin = (() => {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const tzName = dtf.formatToParts(date).find(p => p.type === 'timeZoneName')?.value || 'GMT-6';
    const m = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!m) return -360;
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
  })();
  const startUtc = new Date(Date.parse(`${ymd}T00:00:00Z`) - offsetMin * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString(), ymd };
}

function formatCstTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export default function DispatchMap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('jobs');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [showGeocodeConfirm, setShowGeocodeConfirm] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterToSelection, setFilterToSelection] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch((e) => setMapsError(e.message || 'Failed to load Google Maps'));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapRef.current) return;
    const el = mapContainerRef.current;
    mapRef.current = new google.maps.Map(el, {
      center: DFW_CENTER,
      zoom: 9,
      minZoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      restriction: {
        latLngBounds: { north: 34.5, south: 31.5, west: -98.8, east: -95.5 },
        strictBounds: false,
      },
    });
    infoWindowRef.current = new google.maps.InfoWindow();

    // Re-center to DFW whenever container resizes (fixes mobile "world map" on first paint with 0-size container)
    const ro = new ResizeObserver(() => {
      if (!mapRef.current) return;
      google.maps.event.trigger(mapRef.current, 'resize');
      if (markersRef.current.length === 0) {
        mapRef.current.setCenter(DFW_CENTER);
        mapRef.current.setZoom(9);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapsReady]);

  // ---- Queries ----
  const jobsQuery = useQuery({
    queryKey: ['dispatch-map-jobs', 'v2'],
    enabled: isJobView(view),
    queryFn: async (): Promise<JobRow[]> => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          id, job_number, title, priority,
          customer:crm_customers!crm_jobs_customer_id_fkey(first_name, last_name, company_name),
          location:crm_locations!crm_jobs_location_id_fkey(id, address_line1, city, state, zip_code, latitude, longitude),
          stage:crm_job_stages!crm_jobs_current_stage_id_fkey(name, stage_type, color),
          job_type:crm_job_types!crm_jobs_job_type_id_fkey(name, slug)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Only show truly open jobs: exclude completed, closed_won, cancelled, end
      return (data || []).filter((j: any) => OPEN_STAGE_TYPES.has(j.stage?.stage_type)) as JobRow[];
    },
  });

  const { startIso, endIso, ymd } = useMemo(() => cstDayRange(selectedDate), [selectedDate]);

  const apptsQuery = useQuery({
    queryKey: ['dispatch-map-appts', ymd],
    enabled: view === 'appointments',
    queryFn: async (): Promise<AppointmentRow[]> => {
      const { data, error } = await supabase
        .from('crm_job_appointments')
        .select(`
          id, title, start_datetime, end_datetime, assigned_team_id,
          team:crm_teams!crm_job_appointments_assigned_team_id_fkey(id, name, color),
          job:crm_jobs!crm_job_appointments_job_id_fkey(
            id, job_number,
            customer:crm_customers!crm_jobs_customer_id_fkey(first_name, last_name, company_name),
            location:crm_locations!crm_jobs_location_id_fkey(id, address_line1, city, state, zip_code, latitude, longitude)
          )
        `)
        .gte('start_datetime', startIso)
        .lt('start_datetime', endIso)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as any as AppointmentRow[];
    },
  });

  // Compute team color map (stable by team id)
  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const rows = apptsQuery.data || [];
    let i = 0;
    for (const a of rows) {
      const id = a.team?.id;
      if (!id || map.has(id)) continue;
      map.set(id, a.team?.color || TEAM_PALETTE[i % TEAM_PALETTE.length]);
      i++;
    }
    return map;
  }, [apptsQuery.data]);

  // Split into mappable / unmappable (with optional Service/Install sub-filter)
  const { mappableJobs, unmappableJobs } = useMemo(() => {
    const all = jobsQuery.data || [];
    const rows = all.filter(j => {
      const slug = (j.job_type?.slug || '').toLowerCase();
      const name = (j.job_type?.name || '').toLowerCase();
      if (view === 'service') return slug.includes('service-call') || name.includes('service call') || slug.includes('maintenance') || name.includes('maintenance');
      if (view === 'installs') return slug.includes('installation') || name.includes('install') || slug.includes('minisplit') || name.includes('minisplit');
      return true;
    });
    return {
      mappableJobs: rows.filter(j => j.location?.latitude != null && j.location?.longitude != null),
      unmappableJobs: rows.filter(j => !j.location || j.location.latitude == null || j.location.longitude == null),
    };
  }, [jobsQuery.data, view]);

  const { mappableAppts, unmappableAppts } = useMemo(() => {
    const rows = apptsQuery.data || [];
    return {
      mappableAppts: rows.filter(a => a.job?.location?.latitude != null && a.job?.location?.longitude != null),
      unmappableAppts: rows.filter(a => !a.job?.location || a.job.location.latitude == null || a.job.location.longitude == null),
    };
  }, [apptsQuery.data]);

  // Reset selection when view tab or appointments date changes
  useEffect(() => {
    setSelectedIds(new Set());
    setFilterToSelection(false);
  }, [view, ymd]);

  // Apply selection filter for map rendering
  const visibleJobs = useMemo(
    () => (filterToSelection ? mappableJobs.filter(j => selectedIds.has(j.id)) : mappableJobs),
    [mappableJobs, filterToSelection, selectedIds],
  );
  const visibleAppts = useMemo(
    () => (filterToSelection ? mappableAppts.filter(a => selectedIds.has(a.id)) : mappableAppts),
    [mappableAppts, filterToSelection, selectedIds],
  );

  // Map id -> marker for sidebar click-to-focus
  const markerByIdRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentListIds = isJobView(view)
    ? mappableJobs.map(j => j.id)
    : mappableAppts.map(a => a.id);
  const allSelected = currentListIds.length > 0 && currentListIds.every(id => selectedIds.has(id));
  const someSelected = currentListIds.some(id => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentListIds));
  };

  // Render markers
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;
    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current.clear();
    infoWindowRef.current?.close();

    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    if (isJobView(view)) {
      for (const j of visibleJobs) {
        const pos = { lat: Number(j.location!.latitude), lng: Number(j.location!.longitude) };
        const color = PRIORITY_COLORS[j.priority || 'normal'] || NAVY;
        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: j.job_number || j.title || 'Job',
          icon: svgMarkerIcon(color),
        });
        marker.addListener('click', () => {
          const html = `
            <div style="font-family:inherit;min-width:220px">
              <div style="font-weight:600;color:${NAVY}">${j.job_number || 'Job'}</div>
              <div style="font-size:13px;margin-top:2px">${customerName(j.customer)}</div>
              <div style="font-size:12px;color:#555">${j.job_type?.name || ''}</div>
              <div style="font-size:12px;margin-top:4px">
                <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${j.stage?.color || '#eee'};color:#fff">${j.stage?.name || ''}</span>
              </div>
              <div style="font-size:12px;color:#555;margin-top:6px">${formatAddress(j.location)}</div>
              <a href="/admin/jobs/${j.id}" style="display:inline-block;margin-top:8px;color:${NAVY};font-weight:600;font-size:13px">View Job →</a>
            </div>`;
          infoWindowRef.current?.setContent(html);
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
        markersRef.current.push(marker);
        markerByIdRef.current.set(j.id, marker);
        bounds.extend(pos);
        count++;
      }
    } else {
      for (const a of visibleAppts) {
        const loc = a.job!.location!;
        const pos = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
        const color = a.team?.id ? (teamColorMap.get(a.team.id) || NAVY) : '#6b7280';
        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: a.title || a.job?.job_number || 'Appointment',
          icon: svgMarkerIcon(color),
        });
        marker.addListener('click', () => {
          const html = `
            <div style="font-family:inherit;min-width:220px">
              <div style="font-weight:600;color:${NAVY}">${formatCstTime(a.start_datetime)} – ${formatCstTime(a.end_datetime)} CT</div>
              <div style="font-size:13px;margin-top:2px">${customerName(a.job?.customer || null)}</div>
              <div style="font-size:12px;color:#555">${a.job?.job_number || ''}</div>
              <div style="font-size:12px;margin-top:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>
                ${a.team?.name || 'Unassigned'}
              </div>
              <div style="font-size:12px;color:#555;margin-top:6px">${formatAddress(loc)}</div>
              ${a.job?.id ? `<a href="/admin/jobs/${a.job.id}" style="display:inline-block;margin-top:8px;color:${NAVY};font-weight:600;font-size:13px">View Job →</a>` : ''}
            </div>`;
          infoWindowRef.current?.setContent(html);
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
        markersRef.current.push(marker);
        markerByIdRef.current.set(a.id, marker);
        bounds.extend(pos);
        count++;
      }
    }

    if (count > 0) {
      mapRef.current.fitBounds(bounds, 60);
      const listener = google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
        const z = mapRef.current?.getZoom() ?? 10;
        if (count === 1 || z > 14) mapRef.current?.setZoom(13);
        if (z < 8) mapRef.current?.setZoom(9);
      });
      setTimeout(() => google.maps.event.removeListener(listener), 1000);
    } else {
      mapRef.current.setCenter(DFW_CENTER);
      mapRef.current.setZoom(9);
    }
  }, [mapsReady, view, visibleJobs, visibleAppts, teamColorMap]);

  // Pan/open marker from sidebar list by item id
  const focusMarker = (id: string) => {
    const m = markerByIdRef.current.get(id);
    if (!m || !mapRef.current) return;
    mapRef.current.panTo(m.getPosition()!);
    mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 12, 13));
    google.maps.event.trigger(m, 'click');
  };

  // ---- Geocode missing ----
  const unmappableLocations = useMemo(() => {
    const rows: { id: string; address_line1: string; city: string; state: string; zip_code: string }[] = [];
    const seen = new Set<string>();
    const items = isJobView(view)
      ? unmappableJobs.map(j => j.location).filter(Boolean)
      : unmappableAppts.map(a => a.job?.location).filter(Boolean);
    for (const loc of items as any[]) {
      if (!loc?.id || seen.has(loc.id)) continue;
      if (!loc.address_line1 || !loc.city || !loc.zip_code) continue;
      seen.add(loc.id);
      rows.push(loc);
    }
    return rows;
  }, [view, unmappableJobs, unmappableAppts]);

  async function geocodeAddress(addr: string): Promise<google.maps.GeocoderResult | null> {
    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: addr }, (results, status) => {
        if (status === 'OK' && results && results[0]) resolve(results[0]);
        else resolve(null);
      });
    });
  }

  const runGeocodeBackfill = async () => {
    setShowGeocodeConfirm(false);
    setGeocoding(true);
    setGeocodeProgress({ done: 0, total: unmappableLocations.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < unmappableLocations.length; i++) {
      const loc = unmappableLocations[i];
      const fullAddr = `${loc.address_line1}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
      try {
        const result = await geocodeAddress(fullAddr);
        if (!result || !result.geometry?.location) {
          failed++;
        } else {
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          let county = '';
          const countyComp = result.address_components?.find(c => c.types.includes('administrative_area_level_2'));
          if (countyComp) county = countyComp.long_name.replace(' County', '');
          const { error } = await supabase
            .from('crm_locations')
            .update({
              latitude: lat,
              longitude: lng,
              formatted_address: result.formatted_address || null,
              google_place_id: result.place_id || null,
              ...(county ? { county } : {}),
            })
            .eq('id', loc.id);
          if (error) failed++;
        }
      } catch {
        failed++;
      }
      setGeocodeProgress({ done: i + 1, total: unmappableLocations.length, failed });
      await new Promise(r => setTimeout(r, 200));
    }
    setGeocoding(false);
    toast({
      title: 'Geocoding complete',
      description: `${unmappableLocations.length - failed} updated, ${failed} failed.`,
    });
    queryClient.invalidateQueries({ queryKey: ['dispatch-map-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['dispatch-map-appts'] });
  };

  // ---- Render ----
  return (
    <AdminLayout title="Dispatch Map">
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm overflow-hidden border">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 p-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="jobs">All Open</TabsTrigger>
                <TabsTrigger value="service">Service Calls</TabsTrigger>
                <TabsTrigger value="installs">Installs</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
              </TabsList>
            </Tabs>
            {view === 'appointments' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(jobsQuery.isFetching || apptsQuery.isFetching) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(o => !o)}
            >
              {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className="ml-1">{sidebarOpen ? 'Hide' : 'Show'} list</span>
            </Button>
          </div>
        </div>

        {mapsError && (
          <div className="p-3 bg-red-50 text-red-700 text-sm border-b">
            {mapsError}
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* Map */}
          <div className="flex-1 relative">
            <div ref={mapContainerRef} className="absolute inset-0" />
            {!mapsReady && !mapsError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="w-[320px] border-l bg-white flex flex-col">
              <div className="p-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm" style={{ color: NAVY }}>
                    {isJobView(view)
                      ? `${mappableJobs.length} open job${mappableJobs.length === 1 ? '' : 's'}`
                      : `${mappableAppts.length} appointment${mappableAppts.length === 1 ? '' : 's'}`}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} of {currentListIds.length} selected
                  </span>
                </div>
                {currentListIds.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span>{allSelected ? 'Clear all' : 'Select all'}</span>
                    </label>
                    <Button
                      size="sm"
                      variant={filterToSelection ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      style={filterToSelection ? { backgroundColor: NAVY, color: 'white' } : undefined}
                      onClick={() => setFilterToSelection(v => !v)}
                      disabled={selectedIds.size === 0 && !filterToSelection}
                    >
                      {filterToSelection ? 'Showing selection' : 'Filter map to selection'}
                    </Button>
                  </div>
                )}
                {unmappableLocations.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left">
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          style={{ borderColor: GOLD, color: GOLD }}
                        >
                          {unmappableLocations.length} not mappable
                        </Badge>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 max-h-40 overflow-auto">
                      {unmappableLocations.map(loc => (
                        <div key={loc.id} className="text-xs text-muted-foreground border rounded px-2 py-1">
                          {loc.address_line1}, {loc.city}
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        style={{ backgroundColor: NAVY, color: 'white' }}
                        onClick={() => setShowGeocodeConfirm(true)}
                        disabled={geocoding}
                      >
                        {geocoding ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {geocodeProgress.done}/{geocodeProgress.total}
                          </>
                        ) : (
                          <>
                            <Navigation className="h-3 w-3 mr-1" />
                            Geocode Missing
                          </>
                        )}
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {isJobView(view) ? (
                  mappableJobs.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No open jobs to show.</p>
                  ) : (
                    <ul className="divide-y">
                      {mappableJobs.map((j) => (
                        <li key={j.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(j.id)}
                              onCheckedChange={() => toggleSelected(j.id)}
                              aria-label="Select job"
                            />
                          </div>
                          <button
                            type="button"
                            className="flex-1 min-w-0 text-left outline-none"
                            onClick={() => focusMarker(j.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: PRIORITY_COLORS[j.priority || 'normal'] || NAVY }}
                              />
                              <span className="font-medium text-sm" style={{ color: NAVY }}>
                                {j.job_number || 'Job'}
                              </span>
                            </div>
                            <div className="text-sm mt-0.5 truncate">{customerName(j.customer)}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{j.stage?.name || '—'}</span>
                              <span>•</span>
                              <span>{j.location?.city}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  mappableAppts.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No appointments scheduled.</p>
                  ) : (
                    <ul className="divide-y">
                      {mappableAppts.map((a) => {
                        const color = a.team?.id ? (teamColorMap.get(a.team.id) || NAVY) : '#6b7280';
                        return (
                          <li key={a.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(a.id)}
                                onCheckedChange={() => toggleSelected(a.id)}
                                aria-label="Select appointment"
                              />
                            </div>
                            <button
                              type="button"
                              className="flex-1 min-w-0 text-left outline-none"
                              onClick={() => focusMarker(a.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: color }}
                                />
                                <span className="font-medium text-sm" style={{ color: NAVY }}>
                                  {formatCstTime(a.start_datetime)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  – {formatCstTime(a.end_datetime)}
                                </span>
                              </div>
                              <div className="text-sm mt-0.5 truncate">{customerName(a.job?.customer || null)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span>{a.job?.job_number || '—'}</span>
                                <span>•</span>
                                <span>{a.team?.name || 'Unassigned'}</span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      <AlertDialog open={showGeocodeConfirm} onOpenChange={setShowGeocodeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Geocode missing locations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will geocode {unmappableLocations.length} location
              {unmappableLocations.length === 1 ? '' : 's'} using Google Maps and update their
              coordinates. Requests are throttled and partial results are not written. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runGeocodeBackfill} style={{ backgroundColor: NAVY }}>
              Geocode {unmappableLocations.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
