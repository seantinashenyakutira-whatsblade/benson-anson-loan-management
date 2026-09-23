-- Stage 3, Phase 11.6 fix: anon onboarding uploads were denied because the
-- storage policy's subquery on customer_invitations is itself subject to RLS
-- (anon cannot read that table). Route the check through a SECURITY DEFINER
-- helper instead. Additive only: one function + policy replacement.

CREATE OR REPLACE FUNCTION public.invitation_upload_allowed(p_folder TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_invitations
    WHERE id::TEXT = p_folder
      AND status IN ('pending', 'submitted')
      AND expires_at > now()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS onboarding_uploads_anon_insert ON storage.objects;

CREATE POLICY onboarding_uploads_anon_insert ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'onboarding_uploads'
    AND public.invitation_upload_allowed((storage.foldername(name))[1])
  );
