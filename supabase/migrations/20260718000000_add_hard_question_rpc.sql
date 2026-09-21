-- Composite index to support the subject+university id-fetch in
-- sessions.routes.ts now that it's no longer capped by a LIMIT, and mock
-- exam starts run it every time (including hard mode below).
CREATE INDEX IF NOT EXISTS questions_subject_university_idx
  ON questions(subject_id, university_id);

-- Returns question ids (from the given candidate set) that the whole user
-- base actually gets wrong a lot — i.e. real, aggregate, all-user difficulty
-- rather than a static per-question tag. Used by hard-mode mock exams.
CREATE OR REPLACE FUNCTION get_hard_question_ids(
  p_question_ids uuid[],
  p_min_attempts int DEFAULT 5,
  p_wrong_rate_threshold numeric DEFAULT 0.5
)
RETURNS TABLE (question_id uuid)
LANGUAGE sql
STABLE
AS $$
  SELECT sa.question_id
  FROM session_answers sa
  WHERE sa.question_id = ANY(p_question_ids)
  GROUP BY sa.question_id
  HAVING count(*) >= p_min_attempts
     AND (count(*) FILTER (WHERE NOT sa.is_correct))::numeric / count(*) >= p_wrong_rate_threshold
$$;
