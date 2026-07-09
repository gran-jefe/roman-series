-- Migration: Add firebase_uid and email columns to profiles table
-- Purpose: Support Firebase Auth migration - firebase_uid links profiles to
-- Firebase-issued identities, email allows lookup without a password (forgot-password)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE profiles p SET email = au.email FROM auth.users au WHERE au.id = p.id AND p.email IS NULL;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
