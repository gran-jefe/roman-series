-- Migration: Add last_mock_exam_date column to profiles table
-- Purpose: Track when explorer users take their monthly mock exam for rate limiting

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_mock_exam_date timestamp with time zone;

-- Create index for efficient monthly limit queries
CREATE INDEX IF NOT EXISTS profiles_last_mock_exam_date_idx ON profiles(last_mock_exam_date);
