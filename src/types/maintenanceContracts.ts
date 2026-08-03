// Maintenance Contract Tracker types
export type MaintenanceSegment = 'residential' | 'commercial';
export type MaintenanceStatus = 'active' | 'pending' | 'paused' | 'expired' | 'cancelled';
export type MaintenanceBillingModel = 'paid_yearly' | 'paid_monthly' | 'pay_per_visit';
export type MaintenanceVisitType =
  | 'spring_tune_up'
  | 'fall_tune_up'
  | 'quarterly'
  | 'filter_only'
  | 'other';

export interface MaintenanceContract {
  id: string;
  contract_number: string;
  customer_id: string;
  location_id: string | null;
  workedge_property_id: string | null;
  segment: MaintenanceSegment;
  tier: string | null;
  status: MaintenanceStatus;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  renewal_term_months: number;
  billing_model: MaintenanceBillingModel;
  contract_price: number | null;
  per_visit_price: number | null;
  visits_per_year: number;
  last_visit_date: string | null;
  next_visit_due: string | null;
  filter_change_interval_days: number;
  last_filter_change: string | null;
  next_filter_due: string | null;
  notes: string | null;
  tier_id?: string | null;
  tier_name_snapshot?: string | null;
  inclusions_text?: string | null;
  unit_count?: number | null;
  created_at: string;
  updated_at: string;
  // joined
  customer?: { id: string; first_name: string | null; last_name: string | null } | null;
  location?: {
    id: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
    workedge_property_id?: string | null;
  } | null;
}

export interface ContractFilter {
  id: string;
  contract_id: string;
  size: string;
  quantity: number;
  merv_rating: string | null;
  interval_days: number;
  last_changed: string | null;
  next_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractVisit {
  id: string;
  contract_id: string;
  job_id: string | null;
  visit_date: string;
  visit_type: MaintenanceVisitType;
  technician_id: string | null;
  filters_changed: boolean;
  workedge_media_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  technician?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export const SEGMENT_DEFAULTS: Record<
  MaintenanceSegment,
  { visits_per_year: number; billing_model: MaintenanceBillingModel; contract_price: number | null }
> = {
  residential: { visits_per_year: 2, billing_model: 'paid_yearly', contract_price: 189 },
  commercial: { visits_per_year: 4, billing_model: 'paid_yearly', contract_price: null },
};

export const STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const BILLING_OPTIONS: { value: MaintenanceBillingModel; label: string }[] = [
  { value: 'paid_yearly', label: 'Paid Yearly' },
  { value: 'paid_monthly', label: 'Paid Monthly' },
  { value: 'pay_per_visit', label: 'Pay per Visit' },
];

export const VISIT_TYPE_OPTIONS: { value: MaintenanceVisitType; label: string }[] = [
  { value: 'spring_tune_up', label: 'Spring Tune-Up' },
  { value: 'fall_tune_up', label: 'Fall Tune-Up' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'filter_only', label: 'Filter Only' },
  { value: 'other', label: 'Other' },
];
