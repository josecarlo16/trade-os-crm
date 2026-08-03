
ALTER TABLE public.crm_jobs DROP CONSTRAINT IF EXISTS crm_jobs_payment_status_check;
ALTER TABLE public.crm_jobs ADD CONSTRAINT crm_jobs_payment_status_check 
  CHECK (payment_status IN ('no_charge_yet', 'pending', 'deposit_received', 'partial', 'paid', 'refunded', 'not_charging'));
