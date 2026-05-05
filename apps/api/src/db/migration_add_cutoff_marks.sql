-- Migration: Create cutoff_marks table
-- Created: 2026-05-05
-- Description: Stores cutoff marks for each course/university/year combination
-- Used for UTME score predictions and admission target calculations

CREATE TABLE IF NOT EXISTS cutoff_marks (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID        NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  course         TEXT        NOT NULL,
  year           INT         NOT NULL,
  utme_cutoff    INT         NOT NULL,
  putme_weight   INT         NOT NULL DEFAULT 40,
  utme_weight    INT         NOT NULL DEFAULT 60,
  combined_cutoff DECIMAL(5,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(university_id, course, year)
);

-- Create index for faster lookups by university and course
CREATE INDEX IF NOT EXISTS idx_cutoff_marks_university_course ON cutoff_marks(university_id, course, year DESC);
