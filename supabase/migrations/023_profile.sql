-- Stage 2, Migration 023: profile extras (bio, notification opt-ins)
-- Additive nullable columns only. Plus a guard trigger that silently
-- reverts role/branch self-escalation (only owners may change those),
-- and the public avatars storage bucket with owner-only-per-file RLS.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_opt_in BOOLEAN NOT NULL DEFAULT true;

-- Silently ignore role/branch self-changes by non-owners
CREATE OR REPLACE FUNCTION protect_profile_role_branch()
RETURNS TRIGGER AS $$
BEGIN
  IF public.user_role() IS DISTINCT FROM 'owner' THEN
    NEW.role := OLD.role;
    NEW.branch_id := OLD.branch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role_branch ON profiles;
CREATE TRIGGER trg_protect_profile_role_branch
  BEFORE UPDATE OF role, branch_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role_branch();

-- Avatars bucket (public read, per-user write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_write_own ON storage.objects;
CREATE POLICY avatars_write_own ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
