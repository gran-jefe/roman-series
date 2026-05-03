-- Migration: Remove "Use of English" subject and all related data
-- This removes the subject, its questions, and session answers

DELETE FROM session_answers
WHERE question_id IN (
  SELECT id FROM questions WHERE subject_id = (
    SELECT id FROM subjects WHERE name = 'Use of English'
  )
);

DELETE FROM questions
WHERE subject_id = (
  SELECT id FROM subjects WHERE name = 'Use of English'
);

DELETE FROM subjects
WHERE name = 'Use of English';
