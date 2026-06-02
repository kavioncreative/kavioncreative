-- Migration: Add additional_permissions column to profiles to allow user-specific overrides
-- Created: 2026-06-02

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS additional_permissions text[] DEFAULT '{}';
