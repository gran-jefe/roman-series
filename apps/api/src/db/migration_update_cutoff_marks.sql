-- Update cutoff_marks table schema to support Merit/Catch/ELDS format
-- Adds faculty column and the three cutoff columns
-- Makes the old UTME-specific columns optional

ALTER TABLE cutoff_marks
  ADD COLUMN IF NOT EXISTS faculty      TEXT,
  ADD COLUMN IF NOT EXISTS merit_cutoff DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS catch_cutoff DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS elds_cutoff  DECIMAL(6,2);

ALTER TABLE cutoff_marks
  ALTER COLUMN utme_cutoff  DROP NOT NULL,
  ALTER COLUMN putme_weight DROP NOT NULL,
  ALTER COLUMN utme_weight  DROP NOT NULL;
