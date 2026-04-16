-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions
CREATE POLICY "users can view own sessions"
  ON sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can create sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own sessions"
  ON sessions FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session answers
CREATE POLICY "users can view own session answers"
  ON session_answers FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "users can create own session answers"
  ON session_answers FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "users can update own session answers"
  ON session_answers FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Universities (public read)
CREATE POLICY "universities readable by authenticated users"
  ON universities FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admins can manage universities"
  ON universities FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Subjects (public read)
CREATE POLICY "subjects readable by authenticated users"
  ON subjects FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admins can manage subjects"
  ON subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Questions
CREATE POLICY "questions readable by authenticated users"
  ON questions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admins can manage questions"
  ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Options
CREATE POLICY "options readable by authenticated users"
  ON options FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admins can manage options"
  ON options FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Subscriptions
CREATE POLICY "users can view own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own subscriptions"
  ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);