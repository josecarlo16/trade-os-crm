-- Add columns to equipment_documentation table
ALTER TABLE equipment_documentation 
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS verified_working BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS search_query_used TEXT;

-- Add columns to equipment_pages table
ALTER TABLE equipment_pages 
ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS documentation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_content TEXT;

-- Create documentation search log table
CREATE TABLE IF NOT EXISTS documentation_search_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand VARCHAR(100),
  model_number VARCHAR(100),
  cache_hit BOOLEAN DEFAULT FALSE,
  documents_found INTEGER DEFAULT 0,
  search_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for search log table
ALTER TABLE documentation_search_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert search logs (for public documentation search)
CREATE POLICY "Anyone can insert search logs" 
ON documentation_search_log 
FOR INSERT 
WITH CHECK (true);

-- Admins can view search logs
CREATE POLICY "Admins can view search logs" 
ON documentation_search_log 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_docs_model_number ON equipment_documentation(model_number);
CREATE INDEX IF NOT EXISTS idx_equipment_docs_brand_model ON equipment_documentation(brand, model_number);
CREATE INDEX IF NOT EXISTS idx_equipment_pages_brand_lower ON equipment_pages(LOWER(brand));
CREATE INDEX IF NOT EXISTS idx_search_log_created_at ON documentation_search_log(created_at DESC);