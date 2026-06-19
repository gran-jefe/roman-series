-- Migration: Make target_university_id and target_course optional
-- Created: 2026-06-19
-- Reason: Allow registration without university/course selection; these are selected during onboarding

-- Drop existing NOT NULL constraints
ALTER TABLE profiles
ALTER COLUMN target_university_id DROP NOT NULL;

ALTER TABLE profiles
ALTER COLUMN target_course DROP NOT NULL;

-- Drop and recreate foreign key without requiring it
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_target_university_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_target_university_id_fkey
FOREIGN KEY (target_university_id) REFERENCES universities(id) ON DELETE CASCADE;
