-- Migration: Add target_course field and make target_university_id required
-- Created: 2026-05-03

BEGIN;

-- Add target_course column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS target_course TEXT;

-- Drop the existing foreign key constraint on target_university_id if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_target_university_id_fkey;

-- Make target_university_id NOT NULL (set default for existing rows first)
UPDATE profiles
SET target_university_id = (SELECT id FROM universities LIMIT 1)
WHERE target_university_id IS NULL;

ALTER TABLE profiles
ALTER COLUMN target_university_id SET NOT NULL;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE profiles
ADD CONSTRAINT profiles_target_university_id_fkey
FOREIGN KEY (target_university_id) REFERENCES universities(id) ON DELETE CASCADE;

-- Make target_course NOT NULL (set default for existing rows first)
UPDATE profiles
SET target_course = 'Unspecified'
WHERE target_course IS NULL;

ALTER TABLE profiles
ALTER COLUMN target_course SET NOT NULL;

COMMIT;
