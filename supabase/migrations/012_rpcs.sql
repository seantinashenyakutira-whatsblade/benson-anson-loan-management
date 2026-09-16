-- Phase 1, Migration 012: RPCs
-- All financial operations as database functions

-- Generate next document number
CREATE OR REPLACE FUNCTION rpc_next_document_number(doc_type TEXT)
RETURNS TEXT AS $$
DECLARE
  seq document_sequences%ROWTYPE;
  result TEXT;
BEGIN
  SELECT * INTO seq FROM document_sequences WHERE document_type = doc_type FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO document_sequences (document_type, prefix, next_number, padding)
    VALUES (doc_type, UPPER(LEFT(doc_type, 2)), 1, 6)
    RETURNING * INTO seq;
  END IF;
  result := seq.prefix || LPAD(seq.next_number::TEXT, seq.padding, '0');
  UPDATE document_sequences SET next_number = next_number + 1, updated_at = now() WHERE id = seq.id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate loan number
CREATE OR REPLACE FUNCTION rpc_generate_loan_number()
RETURNS TEXT AS $$
BEGIN
  RETURN rpc_next_document_number('loan');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate application number
CREATE OR REPLACE FUNCTION rpc_generate_application_number()
RETURNS TEXT AS $$
BEGIN
  RETURN rpc_next_document_number('application');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate payment number
CREATE OR REPLACE FUNCTION rpc_generate_payment_number()
RETURNS TEXT AS $$
BEGIN
  RETURN rpc_next_document_number('payment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate receipt number
CREATE OR REPLACE FUNCTION rpc_generate_receipt_number()
RETURNS TEXT AS $$
BEGIN
  RETURN rpc_next_document_number('receipt');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate journal entry number
CREATE OR REPLACE FUNCTION rpc_generate_journal_number()
RETURNS TEXT AS $$
BEGIN
  RETURN rpc_next_document_number('journal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve application
CREATE OR REPLACE FUNCTION rpc_approve_application(
  p_application_id UUID,
  p_approved_amount NUMERIC(18,2),
  p_decided_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE loan_applications
  SET status = 'approved',
      approved_amount = p_approved_amount,
      reviewed_at = now(),
      reviewed_by = p_decided_by,
      updated_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'under_review');

  INSERT INTO application_decisions (application_id, decision, decided_by, reason)
  VALUES (p_application_id, 'approved', p_decided_by, p_reason);

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_decided_by, 'approve_application', 'loan_application', p_application_id,
    jsonb_build_object('approved_amount', p_approved_amount, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject application
CREATE OR REPLACE FUNCTION rpc_reject_application(
  p_application_id UUID,
  p_decided_by UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE loan_applications
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      reviewed_by = p_decided_by,
      updated_at = now()
  WHERE id = p_application_id AND status IN ('submitted', 'under_review');

  INSERT INTO application_decisions (application_id, decision, decided_by, reason)
  VALUES (p_application_id, 'rejected', p_decided_by, p_reason);

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_decided_by, 'reject_application', 'loan_application', p_application_id,
    jsonb_build_object('reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disburse loan and generate schedule
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

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_disbursed_by, 'disburse_loan', 'loan', p_loan_id,
    jsonb_build_object('amount', p_amount, 'method', p_method, 'date', p_disbursement_date));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record payment with allocation
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
  v_remaining NUMERIC(18,2);
  v_alloc_amount NUMERIC(18,2);
  v_schedule RECORD;
BEGIN
  SELECT customer_id INTO v_customer_id FROM loans WHERE id = p_loan_id;
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

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_recorded_by, 'record_payment', 'payment', v_payment_id,
    jsonb_build_object('loan_id', p_loan_id, 'amount', p_amount, 'method', p_method));

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate loan status based on schedule
CREATE OR REPLACE FUNCTION rpc_recalculate_loan_status(p_loan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_days_overdue INTEGER;
  v_arrears NUMERIC(18,2);
  v_grace INTEGER;
  v_default_days INTEGER;
  v_health TEXT;
  v_new_status TEXT;
  v_loan RECORD;
BEGIN
  SELECT l.*, lp.grace_period_days, lp.default_after_days
  INTO v_loan
  FROM loans l
  JOIN loan_products lp ON lp.id = l.loan_product_id
  WHERE l.id = p_loan_id;

  -- Calculate days overdue
  SELECT COALESCE(MIN(CURRENT_DATE - due_date), 0), COALESCE(SUM(remaining), 0)
  INTO v_days_overdue, v_arrears
  FROM loan_schedule
  WHERE loan_id = p_loan_id AND status != 'paid' AND due_date < CURRENT_DATE;

  -- Determine health
  IF v_days_overdue <= 0 THEN v_health := 'performing';
  ELSIF v_days_overdue <= v_loan.grace_period_days THEN v_health := 'at_risk';
  ELSIF v_days_overdue < v_loan.default_after_days THEN v_health := 'overdue';
  ELSE v_health := 'defaulted';
  END IF;

  -- Update loan
  UPDATE loans
  SET days_overdue = v_days_overdue,
      arrears_amount = v_arrears,
      health = v_health,
      updated_at = now()
  WHERE id = p_loan_id;

  INSERT INTO audit_logs (action, entity_type, entity_id, after_data)
  VALUES ('recalculate_status', 'loan', p_loan_id,
    jsonb_build_object('days_overdue', v_days_overdue, 'arrears', v_arrears, 'health', v_health));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assess penalties for overdue loans
CREATE OR REPLACE FUNCTION rpc_assess_penalties()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_loan RECORD;
  v_penalty_amount NUMERIC(18,2);
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
        now());
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
