ALTER TABLE estimates 
  ADD COLUMN customer_id UUID REFERENCES crm_customers(id),
  ADD COLUMN location_id UUID REFERENCES crm_locations(id);