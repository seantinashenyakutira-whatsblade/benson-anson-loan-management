-- Phase 9.1, Migration 016: Accounting automation
-- Adds missing cash/income/expense accounts (idempotent), a balanced
-- journal posting helper, and auto-posting inside the existing
-- financial RPCs. Does NOT alter any existing column.

-- ── 1. Top-up chart of accounts (existing codes from 014 untouched) ──
INSERT INTO chart_of_accounts (code, name, account_type, description) VALUES
  ('1020', 'Bank Account', 'asset', 'Bank disbursements and collections'),
  ('1030', 'Mobile Money', 'asset', 'Airtel / MTN mobile money float'),
  ('4300', 'Other Income', 'revenue', 'Non-interest, non-fee income'),
  ('5590', 'Other Expense', 'expense', 'Miscellaneous expenses')
ON CONFLICT (code) DO NOTHING;

-- ── 2. Cash account mapping by payment/disbursement method ──
CREATE OR REPLACE FUNCTION rpc_cash_account_for_method(p_method TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(COALESCE(p_method, 'cash'))
    WHEN 'bank_transfer' THEN '1020'
    WHEN 'airtel_money' THEN '1030'
    WHEN 'mtn_mobile_money' THEN '1030'
    ELSE '1000'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 3. Balanced journal posting helper ──
-- p_lines: JSONB array of {account_code, debit, credit, description}
CREATE OR REPLACE FUNCTION rpc_post_journal(
  p_entry_date DATE,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_created_by UUID,
  p_lines JSONB
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

  v_entry_number := rpc_generate_journal_number();
  v_entry_id := gen_random_uuid();

  INSERT INTO journal_entries (id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, created_by)
  VALUES (v_entry_id, v_entry_number, p_entry_date, p_description, p_reference_type, p_reference_id, v_total_debit, v_total_credit, 'posted', p_created_by);

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    SELECT id INTO v_account_id FROM chart_of_accounts WHERE code = v_line->>'account_code';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown account code: %', v_line->>'account_code';
    END IF;
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES (v_entry_id, v_account_id,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'description');
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Auto-post disbursement: Dr 1200 Loan Portfolio / Cr cash ──
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

  -- Calculate instalment count
  v_instalment_count := CASE v_loan.duration_unit
    WHEN 'days' THEN v_loan.duration
    WHEN 'weeks' THEN v_loan.duration
    WHEN 'months' THEN v_loan.duration
  END;

  -- Calculate base and final instalment
  v_base_amount := ROUND(v_loan.total_repayable / v_instalment_count, 2);
  v_final_amount := v_loan.total_repayable - (v_base_amount * (v_instalment_count - 1));

  -- Determine interval
  v_freq := CASE v_loan.repayment_frequency
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '7 days'
    WHEN 'monthly' THEN INTERVAL '1 month'
  END;

  -- Generate schedule
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

  -- Update loan
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

  -- Post journal: Dr Loans Receivable (principal) / Cr Cash (principal)
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
    )
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_disbursed_by, 'disburse_loan', 'loan', p_loan_id,
    jsonb_build_object('amount', p_amount, 'method', p_method, 'date', p_disbursement_date));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Auto-post payment: Dr cash / Cr 1200 Loans Receivable ──
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
  v_remaining NUMERIC(18,2);
  v_alloc_amount NUMERIC(18,2);
  v_schedule RECORD;
  v_cash_account TEXT;
BEGIN
  SELECT customer_id, loan_number INTO v_customer_id, v_loan_number FROM loans WHERE id = p_loan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;

  v_payment_number := rpc_generate_payment_number();
  v_payment_id := gen_random_uuid();

  INSERT INTO payments (id, payment_number, loan_id, customer_id, amount, payment_method, reference_number, proof_url, paid_at, recorded_by)
  VALUES (v_payment_id, v_payment_number, p_loan_id, v_customer_id, p_amount, p_method, p_reference, p_proof_url, p_paid_at, p_recorded_by);

  -- Allocate across unpaid instalments in due-date order
  v_remaining := p_amount;
  FOR v_schedule IN
    SELECT id, due_amount, paid_amount, remaining
    FROM loan_schedule
    WHERE loan_id = p_loan_id AND status != 'paid'
    ORDER BY due_date
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_alloc_amount := LEAST(v_remaining, v_schedule.remaining);
    IF v_alloc_amount > 0 THEN
      INSERT INTO payment_allocations (payment_id, loan_id, schedule_id, amount, component, allocation_date)
      VALUES (v_payment_id, p_loan_id, v_schedule.id, v_alloc_amount, 'principal', CURRENT_DATE);

      UPDATE loan_schedule
      SET paid_amount = paid_amount + v_alloc_amount,
          remaining = remaining - v_alloc_amount,
          status = CASE WHEN remaining - v_alloc_amount <= 0 THEN 'paid' ELSE 'part_paid' END,
          paid_at = CASE WHEN remaining - v_alloc_amount <= 0 THEN now() ELSE paid_at END
      WHERE id = v_schedule.id;

      v_remaining := v_remaining - v_alloc_amount;
    END IF;
  END LOOP;

  -- Handle overpayment
  IF v_remaining > 0 THEN
    INSERT INTO payment_allocations (payment_id, loan_id, amount, component, allocation_date)
    VALUES (v_payment_id, p_loan_id, v_remaining, 'unallocated', CURRENT_DATE);

    UPDATE loans SET unallocated_credit = unallocated_credit + v_remaining WHERE id = p_loan_id;
  END IF;

  -- Update loan
  UPDATE loans
  SET amount_paid = amount_paid + p_amount,
      outstanding_balance = GREATEST(outstanding_balance - p_amount, 0),
      updated_at = now()
  WHERE id = p_loan_id;

  -- Check if fully paid
  IF (SELECT outstanding_balance FROM loans WHERE id = p_loan_id) <= 0 THEN
    UPDATE loans SET status = 'fully_paid', health = 'performing', closed_at = now(), updated_at = now() WHERE id = p_loan_id;
  END IF;

  -- Post journal: Dr Cash / Cr Loans Receivable
  v_cash_account := rpc_cash_account_for_method(p_method);
  PERFORM rpc_post_journal(
    (p_paid_at AT TIME ZONE 'Africa/Lusaka')::DATE,
    'Payment ' || v_payment_number || ' on ' || v_loan_number || ' — K' || p_amount::TEXT,
    'payment',
    v_payment_id,
    p_recorded_by,
    jsonb_build_array(
      jsonb_build_object('account_code', v_cash_account, 'debit', p_amount, 'credit', 0, 'description', 'Cash in'),
      jsonb_build_object('account_code', '1200', 'debit', 0, 'credit', p_amount, 'description', 'Loan principal recovered')
    )
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_recorded_by, 'record_payment', 'payment', v_payment_id,
    jsonb_build_object('loan_id', p_loan_id, 'amount', p_amount, 'method', p_method));

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Auto-post penalty accrual: Dr 1210 / Cr 4200 ──
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

    -- Apply cap if set
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
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
