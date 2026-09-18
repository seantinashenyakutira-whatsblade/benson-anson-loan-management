-- Stage 1.5, Migration 020: component-aware payment allocation
-- Rewrites rpc_record_payment (same signature) so each instalment's dues
-- are split across penalty → fee → interest → principal following the
-- product's allocation_order, mirroring lib/loan/allocation.ts.
-- Journal posts one credit line per non-zero component; any surplus
-- credits 2100 Deposits Held and lands in loans.unallocated_credit.

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

  -- Allocation order from the loan's product (default matches the engine)
  SELECT string_to_array(COALESCE(lp.allocation_order, 'penalty,fee,interest,principal'), ',')
    INTO v_order
  FROM loans l JOIN loan_products lp ON lp.id = l.loan_product_id
  WHERE l.id = p_loan_id;

  v_payment_number := rpc_generate_payment_number();
  v_payment_id := gen_random_uuid();

  INSERT INTO payments (id, payment_number, loan_id, customer_id, amount, payment_method, reference_number, proof_url, paid_at, recorded_by)
  VALUES (v_payment_id, v_payment_number, p_loan_id, v_customer_id, p_amount, p_method, p_reference, p_proof_url, p_paid_at, p_recorded_by);

  -- Allocate across unpaid instalments in due-date order
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

  -- Post journal: Dr Cash / Cr per-component income accounts
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
    v_lines
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_recorded_by, 'record_payment', 'payment', v_payment_id,
    jsonb_build_object('loan_id', p_loan_id, 'amount', p_amount, 'method', p_method));

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
