-- Migration: Add session tracking columns for 24-hour inactivity timeout

-- Add last_login and session_expires_at to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
  ADD COLUMN IF NOT EXISTS session_expires_at timestamp with time zone;

-- Create index for session expiry queries
CREATE INDEX IF NOT EXISTS profiles_session_expires_at_idx ON profiles(session_expires_at);
