-- Stage 1.5, Migration 019: application → loan conversion
-- New RPC only. No column changes. Caller authorization is enforced
-- inside the function (branch managers pinned to their branch via the
-- customer record; owners unrestricted).

CREATE OR REPLACE FUNCTION rpc_convert_application_to_loan(
  p_application_id UUID,
  p_converted_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_app loan_applications%ROWTYPE;
  v_product loan_products%ROWTYPE;
  v_caller profiles%ROWTYPE;
  v_customer_branch UUID;
  v_loan_id UUID;
  v_loan_no TEXT;
  v_principal NUMERIC(18,2);
  v_total_interest NUMERIC(18,2);
  v_processing_fee NUMERIC(18,2);
  v_total_repayable NUMERIC(18,2);
  v_years NUMERIC;
  v_remaining NUMERIC(18,2);
  v_i INTEGER;
BEGIN
  -- Caller must be owner or branch manager
  SELECT * INTO v_caller FROM profiles WHERE id = p_converted_by;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caller profile not found'; END IF;
  IF v_caller.role NOT IN ('owner', 'branch_manager') THEN
    RAISE EXCEPTION 'Only owners and branch managers can convert applications';
  END IF;

  SELECT * INTO v_app FROM loan_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status != 'approved' THEN
    RAISE EXCEPTION 'Application must be approved before conversion';
  END IF;

  IF EXISTS (SELECT 1 FROM loans WHERE application_id = p_application_id) THEN
    RAISE EXCEPTION 'Application already converted';
  END IF;

  SELECT * INTO v_product FROM loan_products WHERE id = v_app.loan_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan product not found'; END IF;

  -- Branch scope: managers are pinned to their branch via the customer
  SELECT branch_id INTO v_customer_branch FROM customers WHERE id = v_app.customer_id;
  IF v_caller.role = 'branch_manager' AND v_customer_branch IS DISTINCT FROM v_caller.branch_id THEN
    RAISE EXCEPTION 'Application is outside your branch';
  END IF;

  v_principal := COALESCE(v_app.approved_amount, v_app.requested_amount);
  IF v_principal <= 0 THEN RAISE EXCEPTION 'Approved amount must be positive'; END IF;

  -- Interest: same engine as lib/loan/interest.ts (flat / reducing balance)
  IF v_product.interest_type = 'flat' THEN
    v_years := CASE v_app.duration_unit
      WHEN 'months' THEN v_app.duration::NUMERIC / 12
      WHEN 'weeks' THEN v_app.duration::NUMERIC / 52
      ELSE v_app.duration::NUMERIC / 365
    END;
    v_total_interest := ROUND(v_principal * v_product.interest_rate / 100 * v_years, 2);
  ELSE
    v_total_interest := 0;
    v_remaining := v_principal;
    FOR v_i IN 1..v_app.duration LOOP
      v_total_interest := v_total_interest + ROUND(
        v_remaining * v_product.interest_rate / 100 /
        CASE v_app.duration_unit WHEN 'months' THEN 12 WHEN 'weeks' THEN 52 ELSE 365 END, 2);
      v_remaining := v_remaining - ROUND(v_principal / v_app.duration, 2);
    END LOOP;
  END IF;

  -- Processing fee mirrors the product rule
  v_processing_fee := CASE v_product.processing_fee_type
    WHEN 'fixed' THEN v_product.processing_fee_value
    WHEN 'percent' THEN ROUND(v_principal * v_product.processing_fee_value / 100, 2)
    ELSE 0
  END;

  v_total_repayable := v_principal + v_total_interest + v_processing_fee;

  v_loan_no := rpc_generate_loan_number();

  INSERT INTO loans (
    loan_number, application_id, customer_id, loan_product_id,
    branch_id, officer_id,
    principal_amount, interest_rate, interest_type,
    total_interest, total_fees, total_repayable,
    amount_paid, outstanding_balance,
    duration, duration_unit, repayment_frequency,
    status, health
  ) VALUES (
    v_loan_no, p_application_id, v_app.customer_id, v_app.loan_product_id,
    v_customer_branch, v_app.officer_id,
    v_principal, v_product.interest_rate, v_product.interest_type,
    v_total_interest, v_processing_fee, v_total_repayable,
    0, v_total_repayable,
    v_app.duration, v_app.duration_unit, v_product.repayment_frequency,
    'approved', 'performing'
  ) RETURNING id INTO v_loan_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (p_converted_by, 'application.converted', 'loan', v_loan_id,
    jsonb_build_object('application_id', p_application_id, 'loan_number', v_loan_no));

  RETURN v_loan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_convert_application_to_loan(UUID, UUID) TO authenticated;
