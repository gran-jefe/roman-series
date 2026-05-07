-- Migration: Update cutoff_marks table schema
-- Created: 2026-05-07
-- Description: Add faculty and Merit/Catch/ELDS cutoff columns
-- Makes old UTME-specific columns optional

ALTER TABLE cutoff_marks
  ADD COLUMN IF NOT EXISTS faculty      TEXT,
  ADD COLUMN IF NOT EXISTS merit_cutoff DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS catch_cutoff DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS elds_cutoff  DECIMAL(6,2);

ALTER TABLE cutoff_marks
  ALTER COLUMN utme_cutoff  DROP NOT NULL,
  ALTER COLUMN putme_weight DROP NOT NULL,
  ALTER COLUMN utme_weight  DROP NOT NULL;
