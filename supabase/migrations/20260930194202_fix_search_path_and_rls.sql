/*
# Fix update_updated_at search_path and rate_limit_windows policies

## Changes
- Drop existing triggers that depend on update_updated_at
- Recreate update_updated_at with fixed search_path
- Re-create all updated_at triggers
- Add deny-by-default policies on rate_limit_windows
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS senders_updated_at ON senders;
DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS email_jobs_updated_at ON email_jobs;
DROP TRIGGER IF EXISTS slack_connections_updated_at ON slack_connections;

-- Recreate function with fixed search_path
DROP FUNCTION IF EXISTS update_updated_at();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;

-- Re-create triggers
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER senders_updated_at BEFORE UPDATE ON senders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER email_jobs_updated_at BEFORE UPDATE ON email_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER slack_connections_updated_at BEFORE UPDATE ON slack_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Deny-by-default policies on rate_limit_windows (service-role only access)
DROP POLICY IF EXISTS "deny_all_rate_limit_windows" ON rate_limit_windows;
CREATE POLICY "deny_all_rate_limit_windows"
ON rate_limit_windows FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);
