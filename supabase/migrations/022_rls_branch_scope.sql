-- Stage 1.5, Migration 022: branch-scope RLS for managers
-- Policy changes only (no column changes). Managers were able to read
-- loans, applications, schedules, payments and penalties across ALL
-- branches; they are now pinned to their own branch like customers.

DROP POLICY IF EXISTS loans_select ON loans;
CREATE POLICY loans_select ON loans FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager' AND branch_id = public.user_branch())
    OR officer_id = auth.uid()
  );

DROP POLICY IF EXISTS loan_applications_select ON loan_applications;
CREATE POLICY loan_applications_select ON loan_applications FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager'
        AND EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND c.branch_id = public.user_branch()))
    OR officer_id = auth.uid()
  );

DROP POLICY IF EXISTS loan_schedule_select ON loan_schedule;
CREATE POLICY loan_schedule_select ON loan_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans l WHERE l.id = loan_schedule.loan_id
      AND (
        public.user_role() IN ('owner')
        OR (public.user_role() = 'branch_manager' AND l.branch_id = public.user_branch())
        OR l.officer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR EXISTS (
      SELECT 1 FROM loans l WHERE l.id = payments.loan_id
      AND (
        (public.user_role() = 'branch_manager' AND l.branch_id = public.user_branch())
        OR (public.user_role() = 'loan_officer' AND l.officer_id = auth.uid())
        OR (public.user_role() = 'cashier' AND l.branch_id = public.user_branch())
      )
    )
  );

DROP POLICY IF EXISTS payment_allocations_select ON payment_allocations;
CREATE POLICY payment_allocations_select ON payment_allocations FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR EXISTS (
      SELECT 1 FROM payments p JOIN loans l ON l.id = p.loan_id
      WHERE p.id = payment_allocations.payment_id
      AND (
        (public.user_role() = 'branch_manager' AND l.branch_id = public.user_branch())
        OR (public.user_role() = 'loan_officer' AND l.officer_id = auth.uid())
        OR (public.user_role() = 'cashier' AND l.branch_id = public.user_branch())
      )
    )
  );

DROP POLICY IF EXISTS penalties_select ON penalties;
CREATE POLICY penalties_select ON penalties FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR EXISTS (
      SELECT 1 FROM loans l WHERE l.id = penalties.loan_id
      AND (
        (public.user_role() = 'branch_manager' AND l.branch_id = public.user_branch())
        OR (public.user_role() = 'loan_officer' AND l.officer_id = auth.uid())
        OR (public.user_role() = 'cashier' AND l.branch_id = public.user_branch())
      )
    )
  );
