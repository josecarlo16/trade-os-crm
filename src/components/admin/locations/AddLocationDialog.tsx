import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Search, Navigation, X, Plus, Link2, Home, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { LocationMapEmbed } from './LocationMapEmbed';
import type { CrmCustomer, CrmLocation, BUILDING_TYPE_OPTIONS, PropertyLookupData, RELATIONSHIP_TYPE_OPTIONS } from '@/types/crmLocations';
import { RELATIONSHIP_TYPE_OPTIONS as RELATIONSHIP_OPTIONS } from '@/types/crmLocations';

// Map RentCast propertyType to our building_type and location_type
function mapRentCastPropertyType(propertyType: string | null): {
  buildingType: string;
  locationType: 'residential' | 'commercial';
} {
  if (!propertyType) {
    return { buildingType: 'single_family', locationType: 'residential' };
  }
  
  const normalized = propertyType.toLowerCase();
  
  // Commercial detection
  if (normalized.includes('commercial') || 
      normalized.includes('retail') || 
      normalized.includes('office') ||
      normalized.includes('warehouse') ||
      normalized.includes('industrial')) {
    return { buildingType: 'commercial_other', locationType: 'commercial' };
  }
  
  // Residential mappings
  const residentialMap: Record<string, string> = {
    'single family': 'single_family',
    'singlefamily': 'single_family',
    'condo': 'condo',
    'condominium': 'condo',
    'townhouse': 'townhome',
    'townhome': 'townhome',
    'apartment': 'apartment',
    'duplex': 'duplex',
    'triplex': 'duplex',
    'quadruplex': 'duplex',
    'multi-family': 'duplex',
    'multifamily': 'duplex',
    'mobile': 'single_family',
    'manufactured': 'single_family',
  };
  
  for (const [key, value] of Object.entries(residentialMap)) {
    if (normalized.includes(key)) {
      return { buildingType: value, locationType: 'residential' };
    }
  }
  
  return { buildingType: 'single_family', locationType: 'residential' };
}

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CrmCustomer[];
  editingLocation?: CrmLocation | null;
}

const BUILDING_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'townhome', label: 'Townhome' },
  { value: 'condo', label: 'Condominium' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'commercial_office', label: 'Commercial Office' },
  { value: 'commercial_retail', label: 'Commercial Retail' },
  { value: 'commercial_warehouse', label: 'Commercial Warehouse' },
  { value: 'commercial_restaurant', label: 'Commercial Restaurant' },
  { value: 'commercial_other', label: 'Commercial Other' },
];

const COUNTY_APPRAISAL_LINKS = [
  { county: 'Dallas', url: 'https://www.dallascad.org' },
  { county: 'Collin', url: 'https://www.collincad.org' },
  { county: 'Denton', url: 'https://www.dentoncad.com' },
  { county: 'Tarrant', url: 'https://www.tad.org' },
  { county: 'Rockwall', url: 'https://www.rockwallcad.com' },
  { county: 'Hunt', url: 'https://www.hunt-cad.org' },
  { county: 'Kaufman', url: 'https://www.kaufman-cad.org' },
  { county: 'Grayson', url: 'https://www.graysonappraisal.org' },
];

function CustomerSearchCombobox({ customers, value, onChange }: {
  customers: CrmCustomer[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() =>
    [...customers].sort((a, b) => {
      const nameA = a.company_name || `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nameB = b.company_name || `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    }), [customers]);

  const selectedName = useMemo(() => {
    if (!value) return null;
    const c = customers.find(c => c.id === value);
    return c ? (c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : null;
  }, [value, customers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selectedName || 'Search customers...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandInput placeholder="Type a name to search..." />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {sorted.map(c => {
                const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
                return (
                  <CommandItem
                    key={c.id}
                    value={name}
                    onSelect={() => { onChange(c.id); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
export function AddLocationDialog({ open, onOpenChange, customers, editingLocation }: AddLocationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mode toggle: 'new' or 'existing'
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existingLocationSearch, setExistingLocationSearch] = useState('');
  const [selectedExistingLocationId, setSelectedExistingLocationId] = useState<string | null>(null);
  const [existingRelationshipType, setExistingRelationshipType] = useState('owner');

  // Fetch all locations for "Link Existing" mode
  const { data: allLocations = [] } = useQuery({
    queryKey: ['all_crm_locations_for_linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_locations')
        .select(`
          *,
          customer:crm_customers(id, first_name, last_name, company_name)
        `)
        .is('deleted_at', null)
        .order('address_line1');
      if (error) throw error;
      return data || [];
    },
    enabled: open && mode === 'existing' && !editingLocation,
  });

  // Filter existing locations based on search
  const filteredExistingLocations = useMemo(() => {
    if (!existingLocationSearch.trim()) return allLocations;
    const term = existingLocationSearch.toLowerCase();
    return allLocations.filter((loc: any) => {
      const address = `${loc.address_line1} ${loc.city} ${loc.zip_code}`.toLowerCase();
      const customerName = loc.customer
        ? `${loc.customer.first_name || ''} ${loc.customer.last_name || ''} ${loc.customer.company_name || ''}`.toLowerCase()
        : '';
      return address.includes(term) || customerName.includes(term);
    });
  }, [allLocations, existingLocationSearch]);

  // Linked customers with relationship types
  const [linkedCustomers, setLinkedCustomers] = useState<Array<{ customer_id: string; relationship_type: string }>>([]);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    location_name: 'Main House',
    location_type: 'residential' as 'residential' | 'commercial',
    building_type: 'single_family',
    address_line1: '',
    address_line2: '',
    city: '',
    county: '',
    state: 'TX',
    zip_code: '',
    google_place_id: '',
    formatted_address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    square_footage: '',
    year_built: '',
    stories: '',
    lot_size_sqft: '',
    bedrooms: '',
    bathrooms: '',
    gate_code: '',
    access_notes: '',
    parking_instructions: '',
    is_primary: false,
  });

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [propertyDataSource, setPropertyDataSource] = useState<string | null>(null);

  // Fetch linked customers when editing
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['crm_location_customers', editingLocation?.id],
    queryFn: async () => {
      if (!editingLocation?.id) return [];
      const { data, error } = await supabase
        .from('crm_location_customers')
        .select('customer_id, relationship_type')
        .eq('location_id', editingLocation.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingLocation?.id,
  });

  // Populate form when editing
  useEffect(() => {
    if (editingLocation) {
      setFormData({
        customer_id: editingLocation.customer_id,
        location_name: editingLocation.location_name || 'Main House',
        location_type: (editingLocation.location_type as 'residential' | 'commercial') || 'residential',
        building_type: editingLocation.building_type || 'single_family',
        address_line1: editingLocation.address_line1,
        address_line2: editingLocation.address_line2 || '',
        city: editingLocation.city,
        county: editingLocation.county || '',
        state: editingLocation.state,
        zip_code: editingLocation.zip_code,
        google_place_id: editingLocation.google_place_id || '',
        formatted_address: editingLocation.formatted_address || '',
        latitude: editingLocation.latitude,
        longitude: editingLocation.longitude,
        square_footage: editingLocation.square_footage?.toString() || '',
        year_built: editingLocation.year_built?.toString() || '',
        stories: editingLocation.stories?.toString() || '',
        lot_size_sqft: editingLocation.lot_size_sqft?.toString() || '',
        bedrooms: editingLocation.bedrooms?.toString() || '',
        bathrooms: editingLocation.bathrooms?.toString() || '',
        gate_code: editingLocation.gate_code || '',
        access_notes: editingLocation.access_notes || '',
        parking_instructions: editingLocation.parking_instructions || '',
        is_primary: editingLocation.is_primary || false,
      });
      setPropertyDataSource(editingLocation.property_data_source);
    }
  }, [editingLocation]);

  // Populate linked customers from existing data
  useEffect(() => {
    if (existingLinks.length > 0) {
      setLinkedCustomers(existingLinks.map(l => ({
        customer_id: l.customer_id,
        relationship_type: l.relationship_type,
      })));
    }
  }, [existingLinks]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open && !editingLocation) {
      setFormData({
        customer_id: '',
        location_name: 'Main House',
        location_type: 'residential',
        building_type: 'single_family',
        address_line1: '',
        address_line2: '',
        city: '',
        county: '',
        state: 'TX',
        zip_code: '',
        google_place_id: '',
        formatted_address: '',
        latitude: null,
        longitude: null,
        square_footage: '',
        year_built: '',
        stories: '',
        lot_size_sqft: '',
        bedrooms: '',
        bathrooms: '',
        gate_code: '',
        access_notes: '',
        parking_instructions: '',
        is_primary: false,
      });
      setPropertyDataSource(null);
      setLinkedCustomers([]);
      setMode('new');
      setSelectedExistingLocationId(null);
      setExistingLocationSearch('');
      setExistingRelationshipType('owner');
    }
  }, [open, editingLocation]);

  // Geocode manual address to get coordinates and county
  const handleGetCoordinates = async () => {
    if (!formData.address_line1 || !formData.city || !formData.zip_code) {
      toast({
        title: 'Missing Address',
        description: 'Please enter address, city, and ZIP code first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeocoding(true);

    try {
      const fullAddress = `${formData.address_line1}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
      
      // Check if Google Maps is loaded
      if (!window.google?.maps) {
        // Load Google Maps script dynamically
        await new Promise<void>((resolve, reject) => {
          if (window.google?.maps) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=geocoding`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Maps'));
          document.head.appendChild(script);
        });
      }

      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        setIsGeocoding(false);
        
        if (status === 'OK' && results && results[0]) {
          const place = results[0];
          const location = place.geometry?.location;
          
          // Extract county from address components
          let county = '';
          if (place.address_components) {
            const countyComponent = place.address_components.find(
              (c) => c.types.includes('administrative_area_level_2')
            );
            if (countyComponent) {
              county = countyComponent.long_name.replace(' County', '');
            }
          }
          
          setFormData(prev => ({
            ...prev,
            latitude: location?.lat() || null,
            longitude: location?.lng() || null,
            county: county || prev.county,
            formatted_address: place.formatted_address || '',
            google_place_id: place.place_id || '',
          }));
          
          toast({
            title: 'Location Found',
            description: county ? `Coordinates and county (${county}) populated.` : 'Coordinates populated.',
          });
        } else {
          console.error('Geocoding failed:', status);
          toast({
            title: 'Geocoding Failed',
            description: 'Could not find coordinates for this address. Please verify the address is correct.',
            variant: 'destructive',
          });
        }
      });
    } catch (error) {
      setIsGeocoding(false);
      console.error('Error geocoding address:', error);
      toast({
        title: 'Geocoding Error',
        description: 'Failed to load Google Maps. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Lookup property data button handler
  const handleLookupPropertyData = async () => {
    if (!formData.address_line1 || !formData.city || !formData.zip_code) {
      toast({
        title: 'Missing Address',
        description: 'Please enter a complete address before looking up property data.',
        variant: 'destructive',
      });
      return;
    }

    setIsLookingUp(true);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-property-data', {
        body: {
          address: formData.address_line1,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zip_code,
          county: formData.county,
        },
      });

      if (error) throw error;

      if (data?.data) {
        const propertyData = data.data;
        
        // Map RentCast propertyType to our building_type and location_type
        const { buildingType, locationType } = mapRentCastPropertyType(propertyData.propertyClass);
        
        // Update form with retrieved data
        setFormData(prev => ({
          ...prev,
          square_footage: propertyData.squareFootage?.toString() || prev.square_footage,
          year_built: propertyData.yearBuilt?.toString() || prev.year_built,
          stories: propertyData.stories?.toString() || prev.stories,
          lot_size_sqft: propertyData.lotSizeSqft?.toString() || prev.lot_size_sqft,
          bedrooms: propertyData.bedrooms?.toString() || prev.bedrooms,
          bathrooms: propertyData.bathrooms?.toString() || prev.bathrooms,
          building_type: buildingType,
          location_type: locationType,
        }));

        setPropertyDataSource(propertyData.source);

        toast({
          title: 'Property Data Retrieved',
          description: `Data found from ${data.attemptedSource || propertyData.source || 'CAD'}`,
        });
      } else {
        toast({
          title: 'No Data Found',
          description: data?.error || 'Please enter property details manually.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Lookup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Save location mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_id: formData.customer_id,
        location_name: formData.location_name.trim() || null,
        location_type: formData.location_type,
        building_type: formData.building_type || null,
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim() || null,
        city: formData.city.trim(),
        county: formData.county.trim() || null,
        state: formData.state,
        zip_code: formData.zip_code.trim(),
        google_place_id: formData.google_place_id || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        stories: formData.stories ? parseInt(formData.stories) : null,
        lot_size_sqft: formData.lot_size_sqft ? parseInt(formData.lot_size_sqft) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        gate_code: formData.gate_code.trim() || null,
        access_notes: formData.access_notes.trim() || null,
        is_primary: formData.is_primary,
        property_data_source: propertyDataSource || 'manual',
        property_data_verified_at: propertyDataSource ? new Date().toISOString() : null,
      };

      let locationId: string;
      
      if (editingLocation) {
        const { error } = await supabase
          .from('crm_locations')
          .update(payload)
          .eq('id', editingLocation.id);
        if (error) throw error;
        locationId = editingLocation.id;
      } else {
        const { data, error } = await supabase
          .from('crm_locations')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        locationId = data.id;
      }

      // Sync linked customers
      // Delete existing links
      await supabase
        .from('crm_location_customers')
        .delete()
        .eq('location_id', locationId);

      // Insert new links (always include the primary customer_id as owner)
      const allLinks = [
        { location_id: locationId, customer_id: formData.customer_id, relationship_type: 'owner', is_primary_contact: true },
        ...linkedCustomers
          .filter(lc => lc.customer_id !== formData.customer_id)
          .map(lc => ({
            location_id: locationId,
            customer_id: lc.customer_id,
            relationship_type: lc.relationship_type,
            is_primary_contact: false,
          })),
      ];

      if (allLinks.length > 0) {
        const { error: linkError } = await supabase
          .from('crm_location_customers')
          .insert(allLinks);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_locations'] });
      queryClient.invalidateQueries({ queryKey: ['all_crm_locations'] });
      queryClient.invalidateQueries({ queryKey: ['crm_location_customers'] });
      toast({
        title: 'Success',
        description: editingLocation ? 'Location updated successfully' : 'Location added successfully',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Link existing location mutation
  const linkExistingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExistingLocationId || !formData.customer_id) {
        throw new Error('Please select a customer and a location');
      }

      // Check if this link already exists
      const { data: existing } = await supabase
        .from('crm_location_customers')
        .select('id')
        .eq('location_id', selectedExistingLocationId)
        .eq('customer_id', formData.customer_id)
        .maybeSingle();

      if (existing) {
        throw new Error('This customer is already linked to this location');
      }

      const { error } = await supabase
        .from('crm_location_customers')
        .insert({
          location_id: selectedExistingLocationId,
          customer_id: formData.customer_id,
          relationship_type: existingRelationshipType,
          is_primary_contact: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_locations'] });
      queryClient.invalidateQueries({ queryKey: ['all_crm_locations'] });
      queryClient.invalidateQueries({ queryKey: ['crm_location_customers'] });
      toast({
        title: 'Success',
        description: 'Customer linked to existing location',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'existing') {
      linkExistingMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const handleCopyBillingAddress = async () => {
    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    if (selectedCustomer && selectedCustomer.billing_address) {
      const billingAddress = selectedCustomer.billing_address || '';
      const billingLine2 = (selectedCustomer as any).billing_address_line2 || '';
      const billingCity = selectedCustomer.billing_city || '';
      const billingState = selectedCustomer.billing_state || 'TX';
      const billingZip = selectedCustomer.billing_zip || '';

      // Update form with billing address first
      setFormData(prev => ({
        ...prev,
        address_line1: billingAddress,
        address_line2: billingLine2,
        city: billingCity,
        state: billingState,
        zip_code: billingZip,
      }));
      
      toast({
        title: 'Address Copied',
        description: 'Billing address copied. Geocoding to get coordinates and county...',
      });

      // Geocode the address to get lat/lng and county
      try {
        const fullAddress = `${billingAddress}, ${billingCity}, ${billingState} ${billingZip}`;
        
        // Check if Google Maps is loaded
        if (window.google?.maps) {
          const geocoder = new google.maps.Geocoder();
          
          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const place = results[0];
              const location = place.geometry?.location;
              
              // Extract county from address components
              let county = '';
              if (place.address_components) {
                const countyComponent = place.address_components.find(
                  (c) => c.types.includes('administrative_area_level_2')
                );
                if (countyComponent) {
                  county = countyComponent.long_name.replace(' County', '');
                }
              }
              
              setFormData(prev => ({
                ...prev,
                latitude: location?.lat() || null,
                longitude: location?.lng() || null,
                county: county || prev.county,
                formatted_address: place.formatted_address || '',
                google_place_id: place.place_id || '',
              }));
              
              toast({
                title: 'Location Found',
                description: county ? `Coordinates and county (${county}) populated.` : 'Coordinates populated.',
              });
            } else {
              console.error('Geocoding failed:', status);
              toast({
                title: 'Geocoding Note',
                description: 'Address copied but could not get coordinates. Try using property lookup.',
              });
            }
          });
        } else {
          // If Google Maps not loaded, just show a note to use property lookup
          toast({
            title: 'Address Copied',
            description: 'Click "Lookup Property Data" to get coordinates and property details.',
          });
        }
      } catch (error) {
        console.error('Error geocoding billing address:', error);
      }
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  const hasBillingAddress = selectedCustomer?.billing_address && selectedCustomer?.billing_city;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Service Location'}</DialogTitle>
          <DialogDescription>
            {editingLocation 
              ? 'Update the service location details.'
              : 'Add a new location or link a customer to an existing one.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Toggle - only show when adding new (not editing) */}
          {!editingLocation && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <Button
                type="button"
                size="sm"
                variant={mode === 'new' ? 'default' : 'ghost'}
                onClick={() => setMode('new')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'existing' ? 'default' : 'ghost'}
                onClick={() => setMode('existing')}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Link Existing
              </Button>
            </div>
          )}

          {/* Customer Selection - always shown */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            {editingLocation ? (
              <Input
                value={
                  (() => {
                    const c = customers.find(c => c.id === formData.customer_id);
                    return c ? (c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : '';
                  })()
                }
                disabled
              />
            ) : (
              <CustomerSearchCombobox
                customers={customers}
                value={formData.customer_id}
                onChange={(id) => setFormData(prev => ({ ...prev, customer_id: id }))}
              />
            )}
            
            {!editingLocation && mode === 'new' && formData.customer_id && hasBillingAddress && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyBillingAddress}
                className="mt-2"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Use Billing Address
              </Button>
            )}
          </div>

          {/* ========== LINK EXISTING MODE ========== */}
          {mode === 'existing' && !editingLocation && (
            <>
              <div className="space-y-3">
                <Label>Search Existing Locations</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by address, city, or customer name..."
                    value={existingLocationSearch}
                    onChange={(e) => setExistingLocationSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {filteredExistingLocations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {existingLocationSearch ? 'No locations found' : 'No locations available'}
                    </div>
                  ) : (
                    filteredExistingLocations.map((loc: any) => {
                      const isSelected = selectedExistingLocationId === loc.id;
                      const ownerName = loc.customer
                        ? `${loc.customer.first_name || ''} ${loc.customer.last_name || ''}`.trim() || loc.customer.company_name
                        : 'Unknown';
                      return (
                        <div
                          key={loc.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                            isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedExistingLocationId(isSelected ? null : loc.id)}
                        >
                          <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {loc.address_line1}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {loc.city}, {loc.state} {loc.zip_code} · Owner: {ownerName}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="shrink-0">Selected</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Relationship type for existing link */}
              <div className="space-y-2">
                <Label>Relationship to this Location</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={existingRelationshipType}
                  onChange={(e) => setExistingRelationshipType(e.target.value)}
                >
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={linkExistingMutation.isPending || !formData.customer_id || !selectedExistingLocationId}
                >
                  {linkExistingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Link Location
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ========== ADD NEW MODE (or editing) ========== */}
          {(mode === 'new' || editingLocation) && (
            <>

          {/* Additional Linked Customers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Additional People Linked to This Location</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkedCustomers(prev => [...prev, { customer_id: '', relationship_type: 'spouse' }])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Person
              </Button>
            </div>
            
            {linkedCustomers
              .filter(lc => lc.customer_id !== formData.customer_id)
              .map((link, index) => {
                const actualIndex = linkedCustomers.findIndex(lc => lc === link);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={link.customer_id}
                      onChange={(e) => {
                        const updated = [...linkedCustomers];
                        updated[actualIndex] = { ...updated[actualIndex], customer_id: e.target.value };
                        setLinkedCustomers(updated);
                      }}
                    >
                      <option value="">Select person...</option>
                      {customers
                        .filter(c => c.id !== formData.customer_id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}
                          </option>
                        ))}
                    </select>
                    <select
                      className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={link.relationship_type}
                      onChange={(e) => {
                        const updated = [...linkedCustomers];
                        updated[actualIndex] = { ...updated[actualIndex], relationship_type: e.target.value };
                        setLinkedCustomers(updated);
                      }}
                    >
                      {RELATIONSHIP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setLinkedCustomers(prev => prev.filter((_, i) => i !== actualIndex))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            
            {linkedCustomers.filter(lc => lc.customer_id !== formData.customer_id).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Link additional people like a spouse, GC, or tenant to this location.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_name">Location Name</Label>
              <Input
                id="location_name"
                placeholder="Main House, Rental Property, etc."
                value={formData.location_name}
                onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_type">Type *</Label>
              <select
                id="location_type"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.location_type}
                onChange={(e) => setFormData(prev => ({ ...prev, location_type: e.target.value as 'residential' | 'commercial' }))}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="building_type">Building Type</Label>
            <select
              id="building_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.building_type}
              onChange={(e) => setFormData(prev => ({ ...prev, building_type: e.target.value }))}
            >
              {BUILDING_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-4 border p-4 rounded-lg">
            <h3 className="font-semibold">Address</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  required
                  placeholder="3180 Carmel St"
                  value={formData.address_line1}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  placeholder="Apt, Suite, Unit, etc."
                  value={formData.address_line2}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  placeholder="Dallas"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  placeholder="Auto-populated from address"
                  value={formData.county}
                  onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  required
                  placeholder="75204"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                />
              </div>
            </div>

            {/* Get Coordinates Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetCoordinates}
              disabled={isGeocoding || !formData.address_line1 || !formData.city || !formData.zip_code}
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting coordinates...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Get Coordinates & County
                </>
              )}
            </Button>

            {/* Google Map */}
            {formData.latitude && formData.longitude && (
              <LocationMapEmbed
                latitude={formData.latitude}
                longitude={formData.longitude}
                address={formData.formatted_address || formData.address_line1}
              />
            )}
          </div>

          {/* Property Details */}
          <div className="space-y-4 border p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Property Details</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLookupPropertyData}
                disabled={isLookingUp || !formData.address_line1 || !formData.city || !formData.zip_code}
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Lookup Property Data
                  </>
                )}
              </Button>
            </div>

            {propertyDataSource && (
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                Data source: {propertyDataSource}
              </div>
            )}

            {/* County Appraisal District Links */}
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              <p className="mb-1">Can't find data? Try these appraisal districts:</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {COUNTY_APPRAISAL_LINKS.map(({ county, url }) => (
                  <a
                    key={county}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {county}
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="square_footage">Sq Ft</Label>
                <Input
                  id="square_footage"
                  type="number"
                  placeholder="2000"
                  value={formData.square_footage}
                  onChange={(e) => setFormData(prev => ({ ...prev, square_footage: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  placeholder="2015"
                  value={formData.year_built}
                  onChange={(e) => setFormData(prev => ({ ...prev, year_built: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stories">Stories</Label>
                <Input
                  id="stories"
                  type="number"
                  placeholder="2"
                  value={formData.stories}
                  onChange={(e) => setFormData(prev => ({ ...prev, stories: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot_size_sqft">Lot Size (sq ft)</Label>
                <Input
                  id="lot_size_sqft"
                  type="number"
                  placeholder="5000"
                  value={formData.lot_size_sqft}
                  onChange={(e) => setFormData(prev => ({ ...prev, lot_size_sqft: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  placeholder="3"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  placeholder="2.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Access Information */}
          <div className="space-y-4 border p-4 rounded-lg">
            <h3 className="font-semibold">Access Information</h3>

            <div className="space-y-2">
              <Label htmlFor="gate_code">Gate Code</Label>
              <Input
                id="gate_code"
                placeholder="#1234"
                value={formData.gate_code}
                onChange={(e) => setFormData(prev => ({ ...prev, gate_code: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_notes">Access Notes</Label>
              <Textarea
                id="access_notes"
                placeholder="Special access instructions..."
                value={formData.access_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, access_notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parking_instructions">Parking Instructions</Label>
              <Textarea
                id="parking_instructions"
                placeholder="Where to park..."
                value={formData.parking_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, parking_instructions: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* Primary Location Flag */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_primary"
              checked={formData.is_primary}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked as boolean }))}
            />
            <Label htmlFor="is_primary" className="text-sm font-normal">
              Primary location for this customer
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !formData.customer_id || !formData.address_line1 || !formData.city}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingLocation ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                editingLocation ? 'Update Location' : 'Add Location'
              )}
            </Button>
          </DialogFooter>
          </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
