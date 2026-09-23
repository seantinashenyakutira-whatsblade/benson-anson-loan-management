-- Phase 5, Migration 030: Notification queue (email + push)
CREATE TABLE notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid REFERENCES profiles(id),
  recipient_customer_id uuid REFERENCES customers(id),
  recipient_email text,
  channel text NOT NULL CHECK (channel IN ('email','push')),
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed','skipped')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_queue_pending
  ON notification_queue (scheduled_for)
  WHERE status = 'queued';

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Service role only (cron writes). No anon/authenticated policies → only service_role can access.
-- Explicitly deny authenticated to avoid accidental reads
CREATE POLICY notification_queue_service_only ON notification_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
