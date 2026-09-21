-- Migration: Admin bulk email announcements + quota ledger
-- Lets admins send a filtered/selected batch of users a one-off email via Resend,
-- falling back to an exportable recipient list when the free-tier send quota would
-- be exceeded (see apps/api/src/routes/admin.announcements.routes.ts).

CREATE TABLE IF NOT EXISTS email_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_count INT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('sent', 'exported')),
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_announcements_created_at_idx ON email_announcements(created_at DESC);

-- Ledger of emails actually dispatched via Resend, used to compute remaining
-- daily/monthly free-tier quota before deciding whether to send or export.
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES email_announcements(id) ON DELETE CASCADE,
  recipient_count INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_send_log_sent_at_idx ON email_send_log(sent_at);

ALTER TABLE email_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- All real access goes through the Express backend's service-role client, which
-- bypasses RLS (same as every other admin-only table since the Firebase Auth
-- migration) - these policies are defense-in-depth, not the actual access gate.
DROP POLICY IF EXISTS "Admins can view announcements" ON email_announcements;
CREATE POLICY "Admins can view announcements"
  ON email_announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create announcements" ON email_announcements;
CREATE POLICY "Admins can create announcements"
  ON email_announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view send log" ON email_send_log;
CREATE POLICY "Admins can view send log"
  ON email_send_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create send log entries" ON email_send_log;
CREATE POLICY "Admins can create send log entries"
  ON email_send_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
