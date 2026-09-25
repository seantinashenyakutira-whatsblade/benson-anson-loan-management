-- Phase F.2-3: cashiers must not read onboarding data (route guard already
-- denies /invitations to cashier; align RLS so the search API cannot leak it).
-- Policy replacement only (no column changes).
DROP POLICY IF EXISTS invitations_select ON customer_invitations;
CREATE POLICY invitations_select ON customer_invitations FOR SELECT
  USING (
    public.user_role() = 'owner'
    OR (branch_id = public.user_branch() AND public.user_role() <> 'cashier')
  );

DROP POLICY IF EXISTS submissions_select ON onboarding_submissions;
CREATE POLICY submissions_select ON onboarding_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_invitations i
      WHERE i.id = onboarding_submissions.invitation_id
        AND (public.user_role() = 'owner' OR (i.branch_id = public.user_branch() AND public.user_role() <> 'cashier'))
    )
  );

DROP POLICY IF EXISTS documents_select ON onboarding_documents;
CREATE POLICY documents_select ON onboarding_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_submissions s
      JOIN customer_invitations i ON i.id = s.invitation_id
      WHERE s.id = onboarding_documents.submission_id
        AND (public.user_role() = 'owner' OR (i.branch_id = public.user_branch() AND public.user_role() <> 'cashier'))
    )
  );
