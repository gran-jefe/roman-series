-- Migration: Add missing Scholar & Elite features
-- Features: difficulty levels, per-question timing, speed analysis flags, study plan caching

-- 1. Add difficulty column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium';

-- 2. Auto-seed difficulty based on historical correctness
-- Logic: hard if <40% correct, easy if >70% correct, medium otherwise
UPDATE questions q
SET difficulty = (
  CASE
    WHEN (
      SELECT COUNT(*) FILTER (WHERE is_correct = true)::float / NULLIF(COUNT(*), 0)
      FROM session_answers sa
      WHERE sa.question_id = q.id
    ) < 0.4 THEN 'hard'
    WHEN (
      SELECT COUNT(*) FILTER (WHERE is_correct = true)::float / NULLIF(COUNT(*), 0)
      FROM session_answers sa
      WHERE sa.question_id = q.id
    ) > 0.7 THEN 'easy'
    ELSE 'medium'
  END
)
WHERE difficulty = 'medium' AND EXISTS (
  SELECT 1 FROM session_answers WHERE question_id = q.id
);

-- 3. Add time_spent_seconds column to session_answers
ALTER TABLE session_answers
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;

-- 4. Add has_speed_analysis and has_study_plan to plan_limits
ALTER TABLE plan_limits
ADD COLUMN IF NOT EXISTS has_speed_analysis BOOLEAN DEFAULT false;

ALTER TABLE plan_limits
ADD COLUMN IF NOT EXISTS has_study_plan BOOLEAN DEFAULT false;

-- 5. Update plan_limits for Scholar and Elite
UPDATE plan_limits SET has_speed_analysis = true WHERE plan_id IN ('scholar', 'elite');
UPDATE plan_limits SET has_study_plan = true WHERE plan_id = 'elite';

-- 6. Add report_type column to analytics_reports for caching study plans separately
ALTER TABLE analytics_reports
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'analytics' CHECK (report_type IN ('analytics', 'study_plan'));

-- 7. Create index on difficulty for faster hard-mode queries
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON questions(difficulty);

-- 8. Create index on time_spent_seconds for analytics queries
CREATE INDEX IF NOT EXISTS session_answers_time_spent_idx ON session_answers(time_spent_seconds);

-- 9. Create composite index for speed analysis queries
CREATE INDEX IF NOT EXISTS session_answers_question_correct_idx ON session_answers(question_id, is_correct);
