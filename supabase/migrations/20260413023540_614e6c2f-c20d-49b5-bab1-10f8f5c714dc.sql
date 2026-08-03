ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMPTZ;

ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT;