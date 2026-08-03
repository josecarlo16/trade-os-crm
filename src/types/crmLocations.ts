// Customer Locations Types - CRM Integration
// src/types/crmLocations.ts
// Aligned with existing CRM system conventions

export interface CrmCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  customer_type: 'residential' | 'commercial';
  customer_status: 'lead' | 'prospect' | 'active' | 'inactive' | 'archived';
  lead_source: string | null;
  tags: string[] | null;
  notes: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLocation {
  id: string;
  customer_id: string;
  
  // Location identification
  location_name: string | null;
  location_type: string | null;
  building_type: string | null;
  
  // Address
  address_line1: string;
  address_line2: string | null;
  city: string;
  county: string | null;
  state: string;
  zip_code: string;
  
  // Google Places
  google_place_id?: string | null;
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  
  // Property details
  square_footage?: number | null;
  year_built?: number | null;
  stories?: number | null;
  lot_size_sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  
  // Access
  gate_code?: string | null;
  access_notes?: string | null;
  parking_instructions?: string | null;
  
  // Flags
  is_primary?: boolean | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  
  // Metadata
  property_data_source?: string | null;
  property_data_updated_at?: string | null;
  property_data_verified_at?: string | null;
  property_data_auto_populated?: boolean | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  customer?: CrmCustomer;
  linked_customers?: CrmLocationCustomer[];
}

export interface CrmLocationCustomer {
  id: string;
  location_id?: string;
  customer_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
  created_at: string;
  customer?: Partial<CrmCustomer>;
}

export const RELATIONSHIP_TYPE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'tenant', label: 'Tenant' },
] as const;

export interface CrmLocationEquipment {
  id: string;
  location_id: string;
  
  equipment_type: 'hvac' | 'furnace' | 'heat_pump' | 'mini_split' | 'water_heater';
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  
  tonnage: number | null;
  seer_rating: number | null;
  hspf_rating: number | null;
  btu_capacity: number | null;
  refrigerant_type: string | null;
  
  install_date: string | null;
  manufacture_date: string | null;
  estimated_age: number | null;
  condition_rating: number | null;
  
  last_service_date: string | null;
  next_service_due: string | null;
  warranty_expiration: string | null;
  
  location_description: string | null;
  zone_served: string | null;
  
  is_active: boolean;
  replacement_recommended: boolean;
  replacement_priority: 'high' | 'medium' | 'low' | null;
  replacement_notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface CrmLocationServiceHistory {
  id: string;
  location_id: string;
  equipment_id: string | null;
  
  service_date: string;
  service_type: 'maintenance' | 'repair' | 'installation' | 'inspection';
  technician_name: string | null;
  
  work_description: string | null;
  parts_replaced: string[] | null;
  labor_hours: number | null;
  
  parts_cost: number | null;
  labor_cost: number | null;
  total_cost: number | null;
  
  followup_required: boolean;
  followup_notes: string | null;
  next_visit_date: string | null;
  
  created_at: string;
  updated_at: string;
}

export type BuildingType = 
  | 'single_family'
  | 'townhome'
  | 'condo'
  | 'apartment'
  | 'duplex'
  | 'commercial_office'
  | 'commercial_retail'
  | 'commercial_warehouse'
  | 'commercial_restaurant'
  | 'commercial_other';

export const BUILDING_TYPE_OPTIONS: { value: BuildingType; label: string }[] = [
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

export interface PropertyLookupData {
  squareFootage?: number;
  yearBuilt?: number;
  stories?: number;
  lotSizeSqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  county?: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GooglePlaceDetails {
  place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  county?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

// Helper function to get customer full name
export function getCustomerFullName(customer: CrmCustomer | undefined): string {
  if (!customer) return '';
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
}

// Helper function to format address
export function formatLocationAddress(location: CrmLocation): string {
  const parts = [
    location.address_line1,
    location.address_line2,
    `${location.city}, ${location.state} ${location.zip_code}`,
  ].filter(Boolean);
  
  return parts.join('\n');
}

// Helper function to format property details
export function formatPropertyDetails(location: CrmLocation): string[] {
  const details: string[] = [];
  
  if (location.square_footage) {
    details.push(`${location.square_footage.toLocaleString()} sq ft`);
  }
  if (location.year_built) {
    details.push(`Built ${location.year_built}`);
  }
  if (location.stories) {
    details.push(`${location.stories} ${location.stories === 1 ? 'story' : 'stories'}`);
  }
  if (location.bedrooms) {
    details.push(`${location.bedrooms} bed`);
  }
  if (location.bathrooms) {
    details.push(`${location.bathrooms} bath`);
  }
  
  return details;
}
