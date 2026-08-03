-- Phase 6 Part 1: Add super_admin to app_role enum
-- This must be committed before the value can be used in functions/policies

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';