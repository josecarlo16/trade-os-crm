export interface OttoInvoice {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  total_paid: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  customers?: OttoCustomer;
}

export interface OttoCustomer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OttoPayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface OttoLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface OttoBusiness {
  id: string;
  user_id: string;
  name: string;
  owner_name: string;
  email: string | null;
  phone: string | null;
  default_tax_rate: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
  default_payment_terms: string | null;
  default_notes: string | null;
  estimate_prefix: string | null;
  estimate_valid_days: number | null;
}

export interface OttoEstimate {
  id: string;
  business_id: string;
  customer_id: string;
  estimate_number: string;
  estimate_date: string;
  valid_until: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: OttoCustomer;
}

export interface OttoEstimateLineItem {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface OttoServiceTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OttoTemplateLineItem {
  id: string;
  template_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

export interface OttoMaterial {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string | null;
  category: string | null;
  created_at: string;
}

export interface OttoEquipmentCatalog {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  model_number: string | null;
  brand: string | null;
  unit_price: number;
  category: string | null;
  created_at: string;
}

export interface LineItemDraft {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}
