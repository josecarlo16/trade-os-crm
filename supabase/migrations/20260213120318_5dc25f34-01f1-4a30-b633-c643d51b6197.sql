
-- Update the check constraint to allow closed_won and closed_lost stage types
ALTER TABLE crm_job_stages DROP CONSTRAINT crm_job_stages_stage_type_check;
ALTER TABLE crm_job_stages ADD CONSTRAINT crm_job_stages_stage_type_check 
  CHECK (stage_type = ANY (ARRAY['initial','in_progress','review','completed','cancelled','closed_won','closed_lost']));
