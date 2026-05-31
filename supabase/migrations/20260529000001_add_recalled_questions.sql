-- Migration: Add Recalled UI-POSTUTME Questions feature (Elite only)

-- 1. Add recalled_questions flag to plan_limits
ALTER TABLE plan_limits
ADD COLUMN IF NOT EXISTS has_recalled_questions boolean NOT NULL DEFAULT false;

-- 2. Update plan_limits to enable recalled_questions for Elite only
UPDATE plan_limits SET has_recalled_questions = true WHERE plan_id = 'elite';
UPDATE plan_limits SET has_recalled_questions = false WHERE plan_id IN ('explorer', 'scholar');

-- 3. Create recalled_questions table
-- This stores questions that are confirmed to have appeared in past PUTME exams
CREATE TABLE IF NOT EXISTS recalled_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  body text NOT NULL,
  explanation text,
  year integer,
  exam_type text CHECK (exam_type IN ('post_utme', 'post_utme_mock')) DEFAULT 'post_utme',
  difficulty_level text CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT recalled_questions_year_check CHECK (year IS NULL OR year >= 1990)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS recalled_questions_subject_id_idx ON recalled_questions(subject_id);
CREATE INDEX IF NOT EXISTS recalled_questions_university_id_idx ON recalled_questions(university_id);
CREATE INDEX IF NOT EXISTS recalled_questions_year_idx ON recalled_questions(year);
CREATE INDEX IF NOT EXISTS recalled_questions_created_by_idx ON recalled_questions(created_by);

-- 4. Create recalled_question_options table
CREATE TABLE IF NOT EXISTS recalled_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recalled_question_id uuid NOT NULL REFERENCES recalled_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  body text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT recalled_question_options_label_check CHECK (label IN ('A', 'B', 'C', 'D', 'E'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS recalled_question_options_recalled_question_id_idx ON recalled_question_options(recalled_question_id);

-- 5. Enable RLS on recalled_questions table
ALTER TABLE recalled_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recalled_question_options ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for recalled_questions
-- Allow anyone to view recalled questions
DROP POLICY IF EXISTS "Anyone can view recalled questions" ON recalled_questions;
CREATE POLICY "Anyone can view recalled questions"
  ON recalled_questions FOR SELECT
  USING (true);

-- Allow only admins to insert recalled questions
DROP POLICY IF EXISTS "Only admins can insert recalled questions" ON recalled_questions;
CREATE POLICY "Only admins can insert recalled questions"
  ON recalled_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow only admins to update recalled questions
DROP POLICY IF EXISTS "Only admins can update recalled questions" ON recalled_questions;
CREATE POLICY "Only admins can update recalled questions"
  ON recalled_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow only admins to delete recalled questions
DROP POLICY IF EXISTS "Only admins can delete recalled questions" ON recalled_questions;
CREATE POLICY "Only admins can delete recalled questions"
  ON recalled_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Create RLS policies for recalled_question_options
-- Allow anyone to view options
DROP POLICY IF EXISTS "Anyone can view recalled question options" ON recalled_question_options;
CREATE POLICY "Anyone can view recalled question options"
  ON recalled_question_options FOR SELECT
  USING (true);

-- Allow only admins to insert options
DROP POLICY IF EXISTS "Only admins can insert recalled question options" ON recalled_question_options;
CREATE POLICY "Only admins can insert recalled question options"
  ON recalled_question_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Add recalled_question_id column to sessions (optional, for tracking which recalled questions user answered)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_recalled_questions_session boolean DEFAULT false;
