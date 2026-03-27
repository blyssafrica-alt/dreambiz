-- Track sent ad-related notifications to avoid duplicates
CREATE TABLE IF NOT EXISTS ad_notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expiring_soon', 'expired', 'auto_renewed', 'auto_renew_pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ad_id, user_id, type)
);

ALTER TABLE ad_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their ad notification log" ON ad_notification_log;
CREATE POLICY "Users can view their ad notification log"
  ON ad_notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their ad notification log" ON ad_notification_log;
CREATE POLICY "Users can insert their ad notification log"
  ON ad_notification_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);


