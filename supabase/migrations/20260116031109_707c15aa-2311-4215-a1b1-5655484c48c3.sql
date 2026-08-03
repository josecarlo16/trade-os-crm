-- Create estimate_versions table to track estimate revisions
CREATE TABLE public.estimate_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.estimate_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage estimate versions"
  ON public.estimate_versions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view estimate versions"
  ON public.estimate_versions
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_estimate_versions_estimate_id ON public.estimate_versions(estimate_id);
CREATE INDEX idx_estimate_versions_version_number ON public.estimate_versions(estimate_id, version_number DESC);

-- Create function to auto-create version on estimate update
CREATE OR REPLACE FUNCTION public.create_estimate_version()
RETURNS TRIGGER AS $$
DECLARE
  line_items_data JSONB;
  next_version INTEGER;
  change_summary TEXT;
BEGIN
  -- Only create version if significant fields changed
  IF OLD.customer_name IS DISTINCT FROM NEW.customer_name
     OR OLD.customer_email IS DISTINCT FROM NEW.customer_email
     OR OLD.customer_phone IS DISTINCT FROM NEW.customer_phone
     OR OLD.customer_address IS DISTINCT FROM NEW.customer_address
     OR OLD.job_type IS DISTINCT FROM NEW.job_type
     OR OLD.heating_type IS DISTINCT FROM NEW.heating_type
     OR OLD.job_notes IS DISTINCT FROM NEW.job_notes
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.profit_margin IS DISTINCT FROM NEW.profit_margin
     OR OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
     OR OLD.subtotal_cost IS DISTINCT FROM NEW.subtotal_cost
     OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
  THEN
    -- Get current line items
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', eli.id,
        'item_type', eli.item_type,
        'name', eli.name,
        'description', eli.description,
        'quantity', eli.quantity,
        'unit', eli.unit,
        'unit_cost', eli.unit_cost,
        'line_total', eli.line_total,
        'sort_order', eli.sort_order
      ) ORDER BY eli.sort_order
    ), '[]'::jsonb) INTO line_items_data
    FROM public.estimate_line_items eli
    WHERE eli.estimate_id = OLD.id;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM public.estimate_versions
    WHERE estimate_id = OLD.id;
    
    -- Build change summary
    change_summary := '';
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_summary := change_summary || 'Status: ' || OLD.status || ' → ' || NEW.status || '; ';
    END IF;
    IF OLD.grand_total IS DISTINCT FROM NEW.grand_total THEN
      change_summary := change_summary || 'Total: $' || ROUND(OLD.grand_total::numeric, 2) || ' → $' || ROUND(NEW.grand_total::numeric, 2) || '; ';
    END IF;
    IF OLD.customer_name IS DISTINCT FROM NEW.customer_name THEN
      change_summary := change_summary || 'Customer updated; ';
    END IF;
    IF OLD.profit_margin IS DISTINCT FROM NEW.profit_margin THEN
      change_summary := change_summary || 'Profit margin: ' || ROUND((OLD.profit_margin::numeric - 1) * 100) || '% → ' || ROUND((NEW.profit_margin::numeric - 1) * 100) || '%; ';
    END IF;
    
    -- Insert version snapshot (of OLD data before the update)
    INSERT INTO public.estimate_versions (
      estimate_id,
      version_number,
      snapshot_data,
      change_summary,
      created_by
    ) VALUES (
      OLD.id,
      next_version,
      jsonb_build_object(
        'estimate_number', OLD.estimate_number,
        'customer_name', OLD.customer_name,
        'customer_email', OLD.customer_email,
        'customer_phone', OLD.customer_phone,
        'customer_address', OLD.customer_address,
        'job_type', OLD.job_type,
        'heating_type', OLD.heating_type,
        'job_notes', OLD.job_notes,
        'status', OLD.status,
        'profit_margin', OLD.profit_margin,
        'tax_rate', OLD.tax_rate,
        'subtotal_cost', OLD.subtotal_cost,
        'subtotal_charge', OLD.subtotal_charge,
        'tax_amount', OLD.tax_amount,
        'grand_total', OLD.grand_total,
        'valid_until', OLD.valid_until,
        'line_items', line_items_data,
        'created_at', OLD.created_at,
        'updated_at', OLD.updated_at
      ),
      change_summary,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-version on update
CREATE TRIGGER create_estimate_version_trigger
BEFORE UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.create_estimate_version();