-- Questions are organised by topic, not by exam year — the year column
-- was NOT NULL with no default and nothing meaningful populated it
-- (uploads either omitted it, causing failures, or hardcoded the upload
-- date rather than the question's real source year). Drop it entirely.
ALTER TABLE questions DROP COLUMN IF EXISTS year;
