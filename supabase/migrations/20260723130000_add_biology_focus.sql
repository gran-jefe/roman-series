-- Biology: Plant Morphology Focus feature (Elite only)
-- Two content types: a markdown study guide ("Area of Concentration")
-- and a 90-question MCQ bank across 13 sub-topics ("Question Bank").

CREATE TABLE biology_focus_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,        -- 'area_of_concentration'
  content_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE biology_qbank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,   -- e.g. "SECTION A - LEAF SHAPES"
  question_number INT NOT NULL,
  body TEXT NOT NULL,
  option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, option_e TEXT,
  answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE biology_focus_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE biology_qbank_questions ENABLE ROW LEVEL SECURITY;

-- NOTE: the app's real data path is the Express API using the Supabase
-- service-role client (see apps/api/src/routes/biology-focus.routes.ts),
-- which bypasses RLS entirely - actual Elite gating happens there via
-- requireAuth + a profiles.subscription_status check, same pattern as
-- /api/recalled-questions. These policies are defense-in-depth only, in
-- case direct browser/PostgREST access is ever enabled for these tables.
CREATE POLICY "elite users can read focus content"
  ON biology_focus_content FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND subscription_status = 'elite'
    )
  );

CREATE POLICY "elite users can read qbank"
  ON biology_qbank_questions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND subscription_status = 'elite'
    )
  );

CREATE POLICY "admins can manage focus content"
  ON biology_focus_content FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admins can manage qbank"
  ON biology_qbank_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
