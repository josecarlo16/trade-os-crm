-- Add status column to equipment_scans table for tracking submission status
ALTER TABLE public.equipment_scans 
ADD COLUMN status varchar(50) NOT NULL DEFAULT 'new';