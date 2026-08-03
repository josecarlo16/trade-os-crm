-- Add attendee tracking to appointments
ALTER TABLE crm_job_appointments
ADD COLUMN attendee_member_ids uuid[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN crm_job_appointments.attendee_member_ids IS 
  'Array of crm_team_members IDs who should receive calendar invites';