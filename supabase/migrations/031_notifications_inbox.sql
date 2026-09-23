-- Phase 5, Migration 031: In-app notifications inbox (extends existing 010 table)
-- 010 created notifications(user_id, title, message, type, entity_type, entity_id, is_read, read_at)
-- This migration adds the Part-1 inbox columns (kind, body, link) and indexes/policies idempotently.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;

-- Backfill kind/body/link from old columns where new are null (so old rows remain readable)
UPDATE notifications SET kind = COALESCE(kind, type), body = COALESCE(body, message) WHERE kind IS NULL OR body IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON notifications (user_id, created_at DESC);

-- Ensure RLS is enabled (already enabled in 013, but idempotent)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own') THEN
    CREATE POLICY notifications_select_own ON notifications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own') THEN
    CREATE POLICY notifications_update_own ON notifications
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert_service') THEN
    CREATE POLICY notifications_insert_service ON notifications
      FOR INSERT TO authenticated, service_role WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_service_all') THEN
    CREATE POLICY notifications_service_all ON notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
