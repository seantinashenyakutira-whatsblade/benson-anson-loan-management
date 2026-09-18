-- Stage 1.5, Migration 021: branch_id on journal entries and lines
-- Adds NULLABLE columns only (existing columns untouched). Backfills from
-- the referenced business rows. Threads branch through rpc_post_journal
-- and the financial RPCs. Extends statement views with branch columns.

-- ── 1. Nullable columns ──
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_branch ON journal_entries(branch_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_branch ON journal_lines(branch_id);

-- ── 2. Backfill from reference entities ──
UPDATE journal_entries je SET branch_id = l.branch_id
FROM loans l WHERE je.reference_type = 'disbursement' AND je.reference_id = l.id AND je.branch_id IS NULL;

UPDATE journal_entries je SET branch_id = l.branch_id
FROM payments p JOIN loans l ON l.id = p.loan_id
WHERE je.reference_type = 'payment' AND je.reference_id = p.id AND je.branch_id IS NULL;

UPDATE journal_entries je SET branch_id = l.branch_id
FROM penalties p JOIN loans l ON l.id = p.loan_id
WHERE je.reference_type = 'penalty' AND je.reference_id = p.id AND je.branch_id IS NULL;

UPDATE journal_entries je SET branch_id = e.branch_id
FROM expenses e WHERE je.reference_type = 'expense' AND je.reference_id = e.id AND je.branch_id IS NULL;

UPDATE journal_entries je SET branch_id = i.branch_id
FROM income_records i WHERE je.reference_type = 'income' AND je.reference_id = i.id AND je.branch_id IS NULL;

UPDATE journal_lines jl SET branch_id = je.branch_id
FROM journal_entries je WHERE jl.journal_entry_id = je.id AND jl.branch_id IS NULL;

-- ── 3. rpc_post_journal accepts branch (default NULL keeps old callers working) ──
CREATE OR REPLACE FUNCTION rpc_post_journal(
  p_entry_date DATE,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_created_by UUID,
  p_lines JSONB,
  p_branch_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC(18,2) := 0;
  v_total_credit NUMERIC(18,2) := 0;
  v_line JSONB;
  v_account_id UUID;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_actor UUID;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Journal entry requires at least two lines';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_debit := COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_credit := COALESCE((v_line->>'credit')::NUMERIC, 0);
    IF v_debit < 0 OR v_credit < 0 THEN
      RAISE EXCEPTION 'Journal line amounts cannot be negative';
    END IF;
    IF v_debit > 0 AND v_credit > 0 THEN
      RAISE EXCEPTION 'A journal line cannot have both debit and credit';
    END IF;
    IF v_debit = 0 AND v_credit = 0 THEN
      RAISE EXCEPTION 'A journal line must have a debit or a credit';
    END IF;
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  END LOOP;

  IF v_total_debit <= 0 OR v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Unbalanced journal: debit % != credit %', v_total_debit, v_total_credit;
  END IF;

  v_actor := p_created_by;
  IF v_actor IS NULL THEN
    SELECT id INTO v_actor FROM profiles WHERE role = 'owner' ORDER BY created_at LIMIT 1;
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Journal posting requires an actor and no owner profile exists';
    END IF;
  END IF;

  v_entry_number := rpc_generate_journal_number();
  v_entry_id := gen_random_uuid();

  INSERT INTO journal_entries (id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, created_by, branch_id)
  VALUES (v_entry_id, v_entry_number, p_entry_date, p_description, p_reference_type, p_reference_id, v_total_debit, v_total_credit, 'posted', v_actor, p_branch_id);

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    SELECT id INTO v_account_id FROM chart_of_accounts WHERE code = v_line->>'account_code';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown account code: %', v_line->>'account_code';
    END IF;
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description, branch_id)
    VALUES (v_entry_id, v_account_id,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'description', p_branch_id);
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Thread loan branch through disburse + payment postings ──
CREATE OR REPLACE FUNCTION rpc_disburse_loan(
  p_loan_id UUID,
  p_amount NUMERIC(18,2),
  p_disbursement_date DATE,
  p_method TEXT,
  p_disbursed_by UUID
)
RETURNS VOID AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_instalment_count INTEGER;
  v_base_amount NUMERIC(18,2);
  v_final_amount NUMERIC(18,2);
  v_due_date DATE;
  v_i INTEGER;
  v_freq INTERVAL;
  v_cash_account TEXT;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found or not approved'; END IF;

  v_instalment_count := CASE v_loan.duration_unit
    WHEN 'days' THEN v_loan.duration
    WHEN 'weeks' THEN v_loan.duration
    WHEN 'months' THEN v_loan.duration
  END;

  v_base_amount := ROUND(v_loan.total_repayable / v_instalment_count, 2);
  v_final_amount := v_loan.total_repayable - (v_base_amount * (v_instalment_count - 1));

  v_freq := CASE v_loan.repayment_frequency
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '7 days'
    WHEN 'monthly' THEN INTERVAL '1 month'
  END;

  FOR v_i IN 1..v_instalment_count LOOP
    v_due_date := p_disbursement_date + (v_freq * v_i);
    INSERT INTO loan_schedule (loan_id, instalment_number, due_date, due_amount, principal_due, interest_due, fee_due, remaining, status)
    VALUES (
      p_loan_id,
      v_i,
      v_due_date,
      CASE WHEN v_i = v_instalment_count THEN v_final_amount ELSE v_base_amount END,
      ROUND(v_loan.principal_amount / v_instalment_count, 2),
      ROUND(v_loan.total_interest / v_instalment_count, 2),
      0,
      CASE WHEN v_i = v_instalment_count THEN v_final_amount ELSE v_base_amount END,
      'upcoming'
    );
  END LOOP;

  UPDATE loans
  SET status = 'disbursed',
      health = 'performing',
      disbursement_date = p_disbursement_date,
      first_due_date = p_disbursement_date + v_freq,
      maturity_date = v_due_date,
      outstanding_balance = total_repayable,
      disbursement_method = p_method,
      disbursed_by = p_disbursed_by,
      updated_at = now()
  WHERE id = p_loan_id;

  v_cash_account := rpc_cash_account_for_method(p_method);
  PERFORM rpc_post_journal(
    p_disbursement_date,
    'Disbursement ' || v_loan.loan_number || ' — K' || v_loan.principal_amount::TEXT,
    'disbursement',
    p_loan_id,
    p_disbursed_by,
    jsonb_build_array(
      jsonb_build_object('account_code', '1200', 'debit', v_loan.principal_amount, 'credit', 0, 'description', 'Loan principal receivable'),
      jsonb_build_object('account_code', v_cash_account, 'debit', 0, 'credit', v_loan.principal_amount, 'description', 'Cash out')
    ),
    v_loan.branch_id
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_disbursed_by, 'disburse_loan', 'loan', p_loan_id,
    jsonb_build_object('amount', p_amount, 'method', p_method, 'date', p_disbursement_date));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Thread loan branch through payment postings ──
CREATE OR REPLACE FUNCTION rpc_record_payment(
  p_loan_id UUID,
  p_amount NUMERIC(18,2),
  p_method TEXT,
  p_reference TEXT DEFAULT NULL,
  p_proof_url TEXT DEFAULT NULL,
  p_paid_at TIMESTAMPTZ DEFAULT now(),
  p_recorded_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
  v_customer_id UUID;
  v_loan_number TEXT;
  v_branch_id UUID;
  v_remaining NUMERIC(18,2);
  v_alloc_amount NUMERIC(18,2);
  v_inst_alloc NUMERIC(18,2);
  v_schedule RECORD;
  v_cash_account TEXT;
  v_order TEXT[];
  v_component TEXT;
  v_due NUMERIC(18,2);
  v_prior NUMERIC(18,2);
  v_owed NUMERIC(18,2);
  v_tot_principal NUMERIC(18,2) := 0;
  v_tot_interest NUMERIC(18,2) := 0;
  v_tot_fee NUMERIC(18,2) := 0;
  v_tot_penalty NUMERIC(18,2) := 0;
  v_lines JSONB := '[]'::JSONB;
BEGIN
  SELECT customer_id, loan_number, branch_id INTO v_customer_id, v_loan_number, v_branch_id
  FROM loans WHERE id = p_loan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;

  SELECT string_to_array(COALESCE(lp.allocation_order, 'penalty,fee,interest,principal'), ',')
    INTO v_order
  FROM loans l JOIN loan_products lp ON lp.id = l.loan_product_id
  WHERE l.id = p_loan_id;

  v_payment_number := rpc_generate_payment_number();
  v_payment_id := gen_random_uuid();

  INSERT INTO payments (id, payment_number, loan_id, customer_id, amount, payment_method, reference_number, proof_url, paid_at, recorded_by)
  VALUES (v_payment_id, v_payment_number, p_loan_id, v_customer_id, p_amount, p_method, p_reference, p_proof_url, p_paid_at, p_recorded_by);

  v_remaining := p_amount;
  FOR v_schedule IN
    SELECT id, penalty_due, fee_due, interest_due, principal_due, paid_amount, remaining
    FROM loan_schedule
    WHERE loan_id = p_loan_id AND status != 'paid'
    ORDER BY due_date
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_inst_alloc := 0;
    FOREACH v_component IN ARRAY v_order LOOP
      EXIT WHEN v_remaining <= 0;
      v_due := CASE v_component
        WHEN 'penalty' THEN v_schedule.penalty_due
        WHEN 'fee' THEN v_schedule.fee_due
        WHEN 'interest' THEN v_schedule.interest_due
        WHEN 'principal' THEN v_schedule.principal_due
        ELSE NULL
      END;
      IF v_due IS NULL THEN
        RAISE EXCEPTION 'Unknown allocation component: %', v_component;
      END IF;
      SELECT COALESCE(SUM(amount), 0) INTO v_prior
      FROM payment_allocations
      WHERE schedule_id = v_schedule.id AND component = v_component;
      v_owed := GREATEST(v_due - v_prior, 0);
      v_alloc_amount := LEAST(v_remaining, v_owed);
      IF v_alloc_amount > 0 THEN
        INSERT INTO payment_allocations (payment_id, loan_id, schedule_id, amount, component, allocation_date)
        VALUES (v_payment_id, p_loan_id, v_schedule.id, v_alloc_amount, v_component, CURRENT_DATE);
        v_remaining := v_remaining - v_alloc_amount;
        v_inst_alloc := v_inst_alloc + v_alloc_amount;
        CASE v_component
          WHEN 'principal' THEN v_tot_principal := v_tot_principal + v_alloc_amount;
          WHEN 'interest' THEN v_tot_interest := v_tot_interest + v_alloc_amount;
          WHEN 'fee' THEN v_tot_fee := v_tot_fee + v_alloc_amount;
          WHEN 'penalty' THEN v_tot_penalty := v_tot_penalty + v_alloc_amount;
        END CASE;
      END IF;
    END LOOP;

    UPDATE loan_schedule
    SET paid_amount = paid_amount + v_inst_alloc,
        remaining = remaining - v_inst_alloc,
        status = CASE WHEN remaining - v_inst_alloc <= 0 THEN 'paid' ELSE 'part_paid' END,
        paid_at = CASE WHEN remaining - v_inst_alloc <= 0 THEN now() ELSE paid_at END
    WHERE id = v_schedule.id;
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO payment_allocations (payment_id, loan_id, amount, component, allocation_date)
    VALUES (v_payment_id, p_loan_id, v_remaining, 'unallocated', CURRENT_DATE);

    UPDATE loans SET unallocated_credit = unallocated_credit + v_remaining WHERE id = p_loan_id;
  END IF;

  UPDATE loans
  SET amount_paid = amount_paid + p_amount,
      outstanding_balance = GREATEST(outstanding_balance - p_amount, 0),
      updated_at = now()
  WHERE id = p_loan_id;

  IF (SELECT outstanding_balance FROM loans WHERE id = p_loan_id) <= 0 THEN
    UPDATE loans SET status = 'fully_paid', health = 'performing', closed_at = now(), updated_at = now() WHERE id = p_loan_id;
  END IF;

  v_cash_account := rpc_cash_account_for_method(p_method);
  v_lines := v_lines || jsonb_build_object('account_code', v_cash_account, 'debit', p_amount, 'credit', 0, 'description', 'Cash in');
  IF v_tot_principal > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_code', '1200', 'debit', 0, 'credit', v_tot_principal, 'description', 'Loan principal recovered');
  END IF;
  IF v_tot_interest > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', v_tot_interest, 'description', 'Interest income');
  END IF;
  IF v_tot_fee > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_code', '4100', 'debit', 0, 'credit', v_tot_fee, 'description', 'Fee income');
  END IF;
  IF v_tot_penalty > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_code', '4200', 'debit', 0, 'credit', v_tot_penalty, 'description', 'Penalty income');
  END IF;
  IF v_remaining > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_code', '2100', 'debit', 0, 'credit', v_remaining, 'description', 'Customer overpayment held');
  END IF;
  PERFORM rpc_post_journal(
    (p_paid_at AT TIME ZONE 'Africa/Lusaka')::DATE,
    'Payment ' || v_payment_number || ' on ' || v_loan_number || ' — K' || p_amount::TEXT,
    'payment',
    v_payment_id,
    p_recorded_by,
    v_lines,
    v_branch_id
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_recorded_by, 'record_payment', 'payment', v_payment_id,
    jsonb_build_object('loan_id', p_loan_id, 'amount', p_amount, 'method', p_method));

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Thread loan branch through penalty postings ──
CREATE OR REPLACE FUNCTION rpc_assess_penalties()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_loan RECORD;
  v_penalty_amount NUMERIC(18,2);
  v_penalty_id UUID;
BEGIN
  FOR v_loan IN
    SELECT l.*, lp.penalty_rule_type, lp.penalty_value, lp.penalty_compounds, lp.penalty_cap
    FROM loans l
    JOIN loan_products lp ON lp.id = l.loan_product_id
    WHERE l.status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')
      AND l.days_overdue > lp.grace_period_days
  LOOP
    v_penalty_amount := CASE v_loan.penalty_rule_type
      WHEN 'fixed' THEN v_loan.penalty_value
      WHEN 'percent_of_overdue' THEN ROUND(v_loan.arrears_amount * v_loan.penalty_value / 100, 2)
      WHEN 'daily' THEN v_loan.penalty_value * v_loan.days_overdue
      WHEN 'weekly' THEN v_loan.penalty_value * CEIL(v_loan.days_overdue::NUMERIC / 7)
      ELSE 0
    END;

    IF v_loan.penalty_cap IS NOT NULL AND v_penalty_amount > v_loan.penalty_cap THEN
      v_penalty_amount := v_loan.penalty_cap;
    END IF;

    IF v_penalty_amount > 0 THEN
      INSERT INTO penalties (loan_id, penalty_type, amount, base_amount, calculation_date, description, assessed_at)
      VALUES (v_loan.id, v_loan.penalty_rule_type, v_penalty_amount, v_loan.arrears_amount, CURRENT_DATE,
        FORMAT('Penalty: %s days overdue, %s%% of K%s', v_loan.days_overdue, v_loan.penalty_value, v_loan.arrears_amount),
        now())
      RETURNING id INTO v_penalty_id;

      PERFORM rpc_post_journal(
        CURRENT_DATE,
        'Penalty accrual on ' || v_loan.loan_number || ' — K' || v_penalty_amount::TEXT,
        'penalty',
        v_penalty_id,
        NULL,
        jsonb_build_array(
          jsonb_build_object('account_code', '1210', 'debit', v_penalty_amount, 'credit', 0, 'description', 'Penalty receivable'),
          jsonb_build_object('account_code', '4200', 'debit', 0, 'credit', v_penalty_amount, 'description', 'Penalty income')
        ),
        v_loan.branch_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Statement views gain branch columns (additive only) ──
DROP VIEW IF EXISTS v_pl_monthly; CREATE VIEW v_pl_monthly AS
SELECT
  date_trunc('month', je.entry_date)::DATE AS month,
  je.branch_id AS branch_id,
  COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END), 0) AS net_profit
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted'
GROUP BY 1, 2;

DROP VIEW IF EXISTS v_pl_by_category; CREATE VIEW v_pl_by_category AS
SELECT
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type AS type,
  je.branch_id AS branch_id,
  CASE WHEN coa.account_type = 'revenue'
    THEN COALESCE(SUM(jl.credit - jl.debit), 0)
    ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
  END AS total
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted' AND coa.account_type IN ('revenue', 'expense')
GROUP BY coa.code, coa.name, coa.account_type, je.branch_id;

DROP VIEW IF EXISTS v_balance_sheet; CREATE VIEW v_balance_sheet AS
SELECT
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type AS type,
  je.branch_id AS branch_id,
  CASE WHEN coa.account_type IN ('liability', 'equity')
    THEN COALESCE(SUM(jl.credit - jl.debit), 0)
    ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
  END AS balance
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted' AND coa.account_type IN ('asset', 'liability', 'equity')
GROUP BY coa.code, coa.name, coa.account_type, je.branch_id;
