-- Distinguishes error-bank retry sessions from regular practice sessions,
-- mirroring the existing is_mock / is_recalled_questions_session flags.
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_error_bank_session boolean DEFAULT false;
