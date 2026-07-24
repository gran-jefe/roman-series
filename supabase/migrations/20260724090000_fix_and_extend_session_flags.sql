-- Migration 20260529000001 was marked applied in migration history but its
-- ALTER TABLE never actually landed on production (same drift pattern as
-- the recalled_questions table itself - see project notes). This silently
-- broke the whole admin activity "session" query, since it selects this
-- column: any 400 from Postgres there is logged and swallowed, so every
-- session-based activity event (mock exams, practice, error bank, recalled
-- questions) has been showing as empty. Re-adding it here, guarded by
-- IF NOT EXISTS so it's a no-op wherever it did apply correctly.
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_recalled_questions_session boolean DEFAULT false;

-- New flag for the Biology: Plant Morphology Focus feature, mirroring the
-- existing is_mock / is_recalled_questions_session / is_error_bank_session
-- pattern so page visits show up in the admin activity feed.
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_biology_focus_session boolean DEFAULT false;
