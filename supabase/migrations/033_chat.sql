-- Phase 5, Migration 033: In-app chat
CREATE TABLE chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  routed_to_role text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','assigned','resolved','closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  read_by jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX idx_chat_threads_routed_role ON chat_threads(routed_to_role);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id, created_at);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Threads: participants (created_by, assigned_to) + matching role can SELECT
CREATE POLICY chat_threads_select ON chat_threads FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.user_role() = routed_to_role
    OR public.user_role() = 'owner'
  );

CREATE POLICY chat_threads_insert ON chat_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY chat_threads_update ON chat_threads FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.user_role() = 'owner');

-- Messages: thread participants + matching role can SELECT; participants can INSERT
CREATE POLICY chat_messages_select ON chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.user_role() = t.routed_to_role OR public.user_role() = 'owner')
    )
  );

CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.user_role() = t.routed_to_role OR public.user_role() = 'owner')
    )
  );

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY chat_attachments_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY chat_attachments_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

-- Updated_at trigger for threads
CREATE OR REPLACE FUNCTION chat_threads_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER chat_threads_updated_at_trg BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION chat_threads_updated_at();
