-- Migration: Add subject_combination column to profiles table
-- Students select exactly 4 subjects after signup; this drives dashboard subjects and mock exams

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subject_combination UUID[] DEFAULT NULL;
