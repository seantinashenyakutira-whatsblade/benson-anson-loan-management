-- Phase 1, Migration 013: RLS Policies
-- Row Level Security for every table

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE collateral ENABLE ROW LEVEL SECURITY;
ALTER TABLE collateral_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE collateral_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collateral_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_officer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's branch
CREATE OR REPLACE FUNCTION public.user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users can read all, update own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- BRANCHES: all authenticated can read, owner/manager can manage
CREATE POLICY branches_select ON branches FOR SELECT USING (true);
CREATE POLICY branches_insert_owner ON branches FOR INSERT
  WITH CHECK (public.user_role() IN ('owner'));
CREATE POLICY branches_update_owner ON branches FOR UPDATE
  USING (public.user_role() IN ('owner', 'branch_manager'));

-- PERMISSIONS: read-only for all
CREATE POLICY permissions_select ON permissions FOR SELECT USING (true);

-- ROLE_PERMISSIONS: read-only for all, owner can manage
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT USING (true);
CREATE POLICY role_permissions_manage ON role_permissions FOR ALL
  USING (public.user_role() = 'owner');

-- CUSTOMERS: officers see own branch, owner/manager see all
CREATE POLICY customers_select ON customers FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager' AND branch_id = public.user_branch())
    OR (public.user_role() IN ('loan_officer', 'cashier') AND branch_id = public.user_branch())
    OR created_by = auth.uid()
  );
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- CUSTOMER_DOCUMENTS: follow customer access
CREATE POLICY customer_documents_select ON customer_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_id
      AND (
        public.user_role() IN ('owner')
        OR (public.user_role() = 'branch_manager' AND c.branch_id = public.user_branch())
        OR (public.user_role() IN ('loan_officer', 'cashier') AND c.branch_id = public.user_branch())
      )
    )
  );
CREATE POLICY customer_documents_insert ON customer_documents FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- COLLATERAL: follow customer access
CREATE POLICY collateral_select ON collateral FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_id
      AND (
        public.user_role() IN ('owner')
        OR (public.user_role() = 'branch_manager' AND c.branch_id = public.user_branch())
        OR (public.user_role() IN ('loan_officer', 'cashier') AND c.branch_id = public.user_branch())
      )
    )
  );
CREATE POLICY collateral_insert ON collateral FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));
CREATE POLICY collateral_update ON collateral FOR UPDATE
  USING (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- COLLATERAL_MEDIA: follow collateral access
CREATE POLICY collateral_media_select ON collateral_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collateral col
      JOIN customers c ON c.id = col.customer_id
      WHERE col.id = collateral_media.collateral_id
      AND (
        public.user_role() IN ('owner')
        OR (public.user_role() = 'branch_manager' AND c.branch_id = public.user_branch())
        OR public.user_role() IN ('loan_officer', 'cashier')
      )
    )
  );
CREATE POLICY collateral_media_insert ON collateral_media FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- COLLATERAL_VALUATIONS: follow collateral access
CREATE POLICY collateral_valuations_select ON collateral_valuations FOR SELECT USING (true);
CREATE POLICY collateral_valuations_insert ON collateral_valuations FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- COLLATERAL_STATUS_HISTORY: follow collateral access
CREATE POLICY collateral_status_history_select ON collateral_status_history FOR SELECT USING (true);

-- LOAN_PRODUCTS: all authenticated can read, owner/manager can manage
CREATE POLICY loan_products_select ON loan_products FOR SELECT USING (true);
CREATE POLICY loan_products_manage ON loan_products FOR ALL
  USING (public.user_role() IN ('owner', 'branch_manager'));

-- LOAN_APPLICATIONS: officers see own, manager sees branch, owner sees all
CREATE POLICY loan_applications_select ON loan_applications FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager')
    OR officer_id = auth.uid()
  );
CREATE POLICY loan_applications_insert ON loan_applications FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));
CREATE POLICY loan_applications_update ON loan_applications FOR UPDATE
  USING (public.user_role() IN ('owner', 'branch_manager'));

-- APPLICATION_DECISIONS: follow application access
CREATE POLICY application_decisions_select ON application_decisions FOR SELECT USING (true);
CREATE POLICY application_decisions_insert ON application_decisions FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- LOANS: officers see own, manager sees branch, owner sees all
CREATE POLICY loans_select ON loans FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager')
    OR officer_id = auth.uid()
  );
CREATE POLICY loans_insert ON loans FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));
CREATE POLICY loans_update ON loans FOR UPDATE
  USING (public.user_role() IN ('owner', 'branch_manager'));

-- LOAN_SCHEDULE: follow loan access
CREATE POLICY loan_schedule_select ON loan_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans l WHERE l.id = loan_schedule.loan_id
      AND (
        public.user_role() IN ('owner')
        OR (public.user_role() = 'branch_manager')
        OR l.officer_id = auth.uid()
      )
    )
  );
CREATE POLICY loan_schedule_insert ON loan_schedule FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- PAYMENTS: cashier records, all read based on role
CREATE POLICY payments_select ON payments FOR SELECT
  USING (
    public.user_role() IN ('owner', 'branch_manager', 'loan_officer', 'cashier')
  );
CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'cashier'));

-- PAYMENT_ALLOCATIONS: follow payment access
CREATE POLICY payment_allocations_select ON payment_allocations FOR SELECT USING (true);
CREATE POLICY payment_allocations_insert ON payment_allocations FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'cashier'));

-- PAYMENT_ADJUSTMENTS: owner/manager only
CREATE POLICY payment_adjustments_select ON payment_adjustments FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager'));
CREATE POLICY payment_adjustments_insert ON payment_adjustments FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- PENALTIES: follow loan access
CREATE POLICY penalties_select ON penalties FOR SELECT USING (true);
CREATE POLICY penalties_insert ON penalties FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- PENALTY_WAIVERS: owner/manager only
CREATE POLICY penalty_waivers_select ON penalty_waivers FOR SELECT USING (true);
CREATE POLICY penalty_waivers_insert ON penalty_waivers FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- LOAN_OFFICER_NOTES: officers see own, manager sees branch, owner sees all
CREATE POLICY loan_officer_notes_select ON loan_officer_notes FOR SELECT
  USING (
    public.user_role() IN ('owner')
    OR (public.user_role() = 'branch_manager')
    OR officer_id = auth.uid()
  );
CREATE POLICY loan_officer_notes_insert ON loan_officer_notes FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'loan_officer'));

-- EXPENSES: owner/manager/cashier
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager', 'cashier'));
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'cashier'));

-- INCOME_RECORDS: owner/manager/cashier
CREATE POLICY income_records_select ON income_records FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager', 'cashier'));
CREATE POLICY income_records_insert ON income_records FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager', 'cashier'));

-- CHART_OF_ACCOUNTS: all authenticated can read, owner manages
CREATE POLICY chart_of_accounts_select ON chart_of_accounts FOR SELECT USING (true);
CREATE POLICY chart_of_accounts_manage ON chart_of_accounts FOR ALL
  USING (public.user_role() = 'owner');

-- JOURNAL_ENTRIES: owner/manager
CREATE POLICY journal_entries_select ON journal_entries FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager'));
CREATE POLICY journal_entries_insert ON journal_entries FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- JOURNAL_LINES: follow journal entry access
CREATE POLICY journal_lines_select ON journal_lines FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager'));
CREATE POLICY journal_lines_insert ON journal_lines FOR INSERT
  WITH CHECK (public.user_role() IN ('owner', 'branch_manager'));

-- AUDIT_LOGS: owner/manager read, system writes
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (public.user_role() IN ('owner', 'branch_manager'));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- SETTINGS: owner manages, all can read
CREATE POLICY settings_select ON settings FOR SELECT USING (true);
CREATE POLICY settings_manage ON settings FOR ALL
  USING (public.user_role() = 'owner');

-- NOTIFICATIONS: users see own
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = auth.uid() OR public.user_role() = 'owner');
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (true);
CREATE POLICY notifications_update_own ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- DOCUMENT_SEQUENCES: system manages
CREATE POLICY document_sequences_select ON document_sequences FOR SELECT USING (true);
CREATE POLICY document_sequences_manage ON document_sequences FOR ALL
  USING (public.user_role() = 'owner');
