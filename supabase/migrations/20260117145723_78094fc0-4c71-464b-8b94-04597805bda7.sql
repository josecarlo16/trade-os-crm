-- Create financing options table for estimator financing plans
CREATE TABLE public.financing_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  tran_code TEXT,
  promotional_offer TEXT NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  payment_factor DECIMAL(10,6) NOT NULL DEFAULT 0,
  months_to_payoff INTEGER,
  contractor_fee DECIMAL(5,2) NOT NULL DEFAULT 0,
  dealer_net_cost TEXT,
  notes TEXT,
  applies_to TEXT[] DEFAULT ARRAY['ductless', 'ducted'],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financing_options ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (read for all authenticated, write for admins)
CREATE POLICY "Authenticated users can view financing options" 
ON public.financing_options 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert financing options" 
ON public.financing_options 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update financing options" 
ON public.financing_options 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete financing options" 
ON public.financing_options 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financing_options_updated_at
BEFORE UPDATE ON public.financing_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial financing options based on the Synchrony promotion document
INSERT INTO public.financing_options (plan_name, tran_code, promotional_offer, interest_rate, payment_factor, months_to_payoff, contractor_fee, dealer_net_cost, sort_order) VALUES
('Plan 600', '600', '9.99% APR Until Paid in Full', 9.99, 0.0125, 132, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 1),
('Plan 604', '604', '7.99% APR Until Paid in Full', 7.99, 0.0200, 61, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 2),
('Plan 602', '602', '5.99% APR Until Paid in Full', 5.99, 0.0300, 37, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 3),
('Plan 605', '605', 'No Monthly Interest if Paid in Full within 18 Months', 0, 0.0250, NULL, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 4),
('Plan 200', '200', '9.99% APR Until Paid in Full', 9.99, 0.0125, 132, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 5),
('Plan 202', '202', '5.99% APR Until Paid in Full', 5.99, 0.0300, 37, 6.35, 'NO COST Elite, NO COST Preferred, 4.35% Diamond', 6);