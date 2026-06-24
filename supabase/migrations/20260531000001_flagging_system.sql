-- Migration: Implement full flagging system for questions
-- Allows users to flag questions for review, admins to view flagged questions

-- 1. Create flagged_questions table
CREATE TABLE IF NOT EXISTS flagged_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS flagged_questions_user_id_idx ON flagged_questions(user_id);
CREATE INDEX IF NOT EXISTS flagged_questions_question_id_idx ON flagged_questions(question_id);
CREATE INDEX IF NOT EXISTS flagged_questions_session_id_idx ON flagged_questions(session_id);
CREATE INDEX IF NOT EXISTS flagged_questions_created_at_idx ON flagged_questions(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for flagged_questions

-- Users can view their own flagged questions
DROP POLICY IF EXISTS "Users can view their own flagged questions" ON flagged_questions;
CREATE POLICY "Users can view their own flagged questions"
  ON flagged_questions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create flags for their own questions
DROP POLICY IF EXISTS "Users can flag questions" ON flagged_questions;
CREATE POLICY "Users can flag questions"
  ON flagged_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own flags (reason)
DROP POLICY IF EXISTS "Users can update their own flags" ON flagged_questions;
CREATE POLICY "Users can update their own flags"
  ON flagged_questions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own flags
DROP POLICY IF EXISTS "Users can delete their own flags" ON flagged_questions;
CREATE POLICY "Users can delete their own flags"
  ON flagged_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all flagged questions (for admin interface)
DROP POLICY IF EXISTS "Admins can view all flagged questions" ON flagged_questions;
CREATE POLICY "Admins can view all flagged questions"
  ON flagged_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
