-- Stage 3, Phase 11.4: notify the inviting officer on application submission.
-- Additive only: replaces rpc_submit_onboarding with an identical body plus a
-- structural notifications insert (dispatch happens in Stage 4). No schema change.

CREATE OR REPLACE FUNCTION rpc_submit_onboarding(
  p_token TEXT,
  p_data JSONB,
  p_document_paths JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_inv customer_invitations%ROWTYPE;
  v_sub_id UUID;
  v_doc JSONB;
  v_required TEXT[] := ARRAY[
    'full_name', 'date_of_birth', 'nrc_or_passport', 'national_id_type',
    'phone', 'address', 'occupation', 'monthly_income',
    'collateral_type', 'collateral_description', 'collateral_estimated_value',
    'collateral_ownership', 'loan_amount_requested', 'loan_purpose',
    'preferred_tenure', 'repayment_source',
    'next_of_kin_name', 'next_of_kin_phone'
  ];
  v_key TEXT;
  v_val TEXT;
BEGIN
  SELECT * INTO v_inv FROM customer_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation has already been used.';
  END IF;
  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation has expired.';
  END IF;

  FOREACH v_key IN ARRAY v_required LOOP
    v_val := NULLIF(TRIM(COALESCE(p_data->>v_key, '')), '');
    IF v_val IS NULL THEN
      RAISE EXCEPTION 'Missing required field: %', v_key;
    END IF;
  END LOOP;

  IF (p_data->>'date_of_birth')::DATE > (CURRENT_DATE - INTERVAL '18 years')::DATE THEN
    RAISE EXCEPTION 'Applicant must be at least 18 years old.';
  END IF;

  INSERT INTO onboarding_submissions (
    invitation_id, full_name, date_of_birth, nrc_or_passport, national_id_type,
    phone, alt_phone, email, address, residence_type, marital_status, nationality,
    occupation, employer_name, employer_address, job_title, employment_duration_months,
    monthly_income, other_income, existing_loans, assets_description,
    collateral_type, collateral_description, collateral_estimated_value,
    collateral_ownership, collateral_location, collateral_serial,
    loan_amount_requested, loan_purpose, preferred_tenure, repayment_source,
    consent_credit_check, consent_accuracy, consent_terms,
    next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
  )
  VALUES (
    v_inv.id, p_data->>'full_name', (p_data->>'date_of_birth')::DATE,
    p_data->>'nrc_or_passport', p_data->>'national_id_type',
    p_data->>'phone', NULLIF(p_data->>'alt_phone', ''), NULLIF(p_data->>'email', ''),
    p_data->>'address', NULLIF(p_data->>'residence_type', ''),
    NULLIF(p_data->>'marital_status', ''), NULLIF(p_data->>'nationality', ''),
    p_data->>'occupation', NULLIF(p_data->>'employer_name', ''),
    NULLIF(p_data->>'employer_address', ''), NULLIF(p_data->>'job_title', ''),
    NULLIF(p_data->>'employment_duration_months', '')::INTEGER,
    (p_data->>'monthly_income')::NUMERIC,
    NULLIF(p_data->>'other_income', ''), NULLIF(p_data->>'existing_loans', ''),
    NULLIF(p_data->>'assets_description', ''),
    p_data->>'collateral_type', p_data->>'collateral_description',
    (p_data->>'collateral_estimated_value')::NUMERIC,
    p_data->>'collateral_ownership', NULLIF(p_data->>'collateral_location', ''),
    NULLIF(p_data->>'collateral_serial', ''),
    (p_data->>'loan_amount_requested')::NUMERIC,
    p_data->>'loan_purpose', p_data->>'preferred_tenure', p_data->>'repayment_source',
    COALESCE((p_data->>'consent_credit_check')::BOOLEAN, false),
    COALESCE((p_data->>'consent_accuracy')::BOOLEAN, false),
    COALESCE((p_data->>'consent_terms')::BOOLEAN, false),
    p_data->>'next_of_kin_name', p_data->>'next_of_kin_phone',
    NULLIF(p_data->>'next_of_kin_relationship', '')
  )
  RETURNING id INTO v_sub_id;

  IF p_document_paths IS NOT NULL THEN
    FOR v_doc IN SELECT * FROM jsonb_array_elements(p_document_paths) LOOP
      IF (v_doc->>'file_path') IS NULL OR (v_doc->>'file_path') NOT LIKE v_inv.id::TEXT || '/%' THEN
        RAISE EXCEPTION 'Document path is not scoped to this invitation.';
      END IF;
      INSERT INTO onboarding_documents (submission_id, doc_type, file_path, file_name, file_size)
      VALUES (
        v_sub_id, v_doc->>'doc_type', v_doc->>'file_path',
        NULLIF(v_doc->>'file_name', ''), NULLIF(v_doc->>'file_size', '')::INTEGER
      );
    END LOOP;
  END IF;

  UPDATE customer_invitations SET status = 'submitted', updated_at = now() WHERE id = v_inv.id;

  INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (
    v_inv.officer_id,
    'New onboarding application',
    'A loan application was submitted' || COALESCE(' for ' || NULLIF(TRIM(p_data->>'full_name'), ''), '') || '.',
    'info',
    'onboarding_submission',
    v_sub_id
  );

  RETURN jsonb_build_object('submission_id', v_sub_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
