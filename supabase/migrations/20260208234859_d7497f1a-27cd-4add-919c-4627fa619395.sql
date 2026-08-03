-- Add linked_member_id column to google_calendars
ALTER TABLE google_calendars 
ADD COLUMN linked_member_id uuid REFERENCES crm_team_members(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN google_calendars.linked_member_id IS 
  'Links this calendar to a specific team member from crm_team_members';