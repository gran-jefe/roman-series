-- Migration: Add is_mock column to sessions table
-- This tracks whether a session is a mock UTME exam (4 subjects, 100 questions)

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT FALSE;
