-- Migration: Remove duplicate subjects with no questions
-- Remove "Use of English" if there's a duplicate, keep the one with questions
-- Remove "C.R.S." / "CRS" duplicates, keep the one with questions
-- Remove "I.R.S." / "IRS" duplicates, keep the one with questions

-- First, identify and delete subjects with no questions (keep the ones with questions)
DELETE FROM subjects s
WHERE s.id NOT IN (
  SELECT DISTINCT q.subject_id FROM questions q
)
AND s.name IN ('Use of English', 'C.R.S.', 'I.R.S.', 'CRS', 'IRS');

-- Optional: Update subject names to match the color mapping in the frontend code
-- This ensures "C.R.S." becomes "CRS" and "I.R.S." becomes "IRS" for consistency
UPDATE subjects SET name = 'CRS' WHERE name = 'C.R.S.' AND id IN (SELECT DISTINCT q.subject_id FROM questions q WHERE q.subject_id = subjects.id);
UPDATE subjects SET name = 'IRS' WHERE name = 'I.R.S.' AND id IN (SELECT DISTINCT q.subject_id FROM questions q WHERE q.subject_id = subjects.id);
