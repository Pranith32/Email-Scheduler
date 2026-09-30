/*
# Email Scheduler Schema

Creates the full data model for a multi-user email scheduling SaaS.

## Tables
- `profiles` — user display info linked to auth.users
- `senders` — email sender accounts (Ethereal SMTP credentials)
- `campaigns` — email campaigns with subject, body, scheduling params
- `email_jobs` — individual email jobs per recipient, linked to a campaign
- `slack_connections` — per-user Slack OAuth tokens for notifications

## Security
- RLS enabled on all tables
- Owner-scoped CRUD policies using auth.uid()
- user_id columns default to auth.uid() for safe inserts

## Notes
- All IDs are UUIDs with defaults
- Indexes added on frequently queried columns
- email_jobs.status constrained to: scheduled, processing, sent, failed, cancelled
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ===== SENDERS =====
CREATE TABLE IF NOT EXISTS senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  ethereal_user text,
  ethereal_password text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE senders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_senders" ON senders;
CREATE POLICY "select_own_senders" ON senders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_senders" ON senders;
CREATE POLICY "insert_own_senders" ON senders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_senders" ON senders;
CREATE POLICY "update_own_senders" ON senders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_senders" ON senders;
CREATE POLICY "delete_own_senders" ON senders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_senders_user_id ON senders(user_id);

-- ===== CAMPAIGNS =====
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES senders(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  start_time timestamptz NOT NULL,
  delay_ms integer NOT NULL DEFAULT 2000,
  hourly_limit integer NOT NULL DEFAULT 200,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns" ON campaigns FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campaigns" ON campaigns;
CREATE POLICY "insert_own_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campaigns" ON campaigns;
CREATE POLICY "update_own_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campaigns" ON campaigns;
CREATE POLICY "delete_own_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- ===== EMAIL JOBS =====
CREATE TABLE IF NOT EXISTS email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES senders(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  recipient_name text DEFAULT '',
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  message_id text,
  preview_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT email_jobs_status_check CHECK (status IN ('scheduled','processing','sent','failed','cancelled'))
);

ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_email_jobs" ON email_jobs;
CREATE POLICY "select_own_email_jobs" ON email_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_email_jobs" ON email_jobs;
CREATE POLICY "insert_own_email_jobs" ON email_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_email_jobs" ON email_jobs;
CREATE POLICY "update_own_email_jobs" ON email_jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_email_jobs" ON email_jobs;
CREATE POLICY "delete_own_email_jobs" ON email_jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_jobs_user_id ON email_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status);
CREATE INDEX IF NOT EXISTS idx_email_jobs_scheduled_at ON email_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_jobs_sent_at ON email_jobs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_jobs_recipient ON email_jobs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_jobs_campaign_id ON email_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_jobs_sender_id ON email_jobs(sender_id);

-- ===== SLACK CONNECTIONS =====
CREATE TABLE IF NOT EXISTS slack_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id text NOT NULL,
  team_name text NOT NULL,
  access_token text NOT NULL,
  channel_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_slack" ON slack_connections;
CREATE POLICY "select_own_slack" ON slack_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_slack" ON slack_connections;
CREATE POLICY "insert_own_slack" ON slack_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_slack" ON slack_connections;
CREATE POLICY "delete_own_slack" ON slack_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== RATE LIMIT TRACKING =====
CREATE TABLE IF NOT EXISTS rate_limit_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES senders(id) ON DELETE CASCADE,
  hour_window timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  notified boolean NOT NULL DEFAULT false,
  UNIQUE(sender_id, hour_window)
);

ALTER TABLE rate_limit_windows ENABLE ROW LEVEL SECURITY;

-- Rate limit windows are managed by service role (edge functions), not client.
-- No client policies needed; access is server-side only via service role key.

-- ===== AUTO-UPDATE updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS senders_updated_at ON senders;
CREATE TRIGGER senders_updated_at BEFORE UPDATE ON senders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS email_jobs_updated_at ON email_jobs;
CREATE TRIGGER email_jobs_updated_at BEFORE UPDATE ON email_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS slack_connections_updated_at ON slack_connections;
CREATE TRIGGER slack_connections_updated_at BEFORE UPDATE ON slack_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
