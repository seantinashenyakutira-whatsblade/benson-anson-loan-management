-- Stage 3, Phase 11.2: Customer self-service onboarding
-- Tables: customer_invitations, onboarding_submissions, onboarding_documents
-- RLS: branch-scoped staff access; public flows go through SECURITY DEFINER RPCs.
-- Storage: private onboarding_uploads bucket; anon upload only under live invitation folders.

-- ── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  officer_id UUID REFERENCES profiles(id) NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES customer_invitations(id) NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  nrc_or_passport TEXT NOT NULL,
  national_id_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT NOT NULL,
  residence_type TEXT,
  marital_status TEXT,
  nationality TEXT,
  occupation TEXT NOT NULL,
  employer_name TEXT,
  employer_address TEXT,
  job_title TEXT,
  employment_duration_months INTEGER,
  monthly_income NUMERIC(18,2) NOT NULL,
  other_income TEXT,
  existing_loans TEXT,
  assets_description TEXT,
  collateral_type TEXT NOT NULL,
  collateral_description TEXT NOT NULL,
  collateral_estimated_value NUMERIC(18,2) NOT NULL,
  collateral_ownership TEXT NOT NULL,
  collateral_location TEXT,
  collateral_serial TEXT,
  loan_amount_requested NUMERIC(18,2) NOT NULL,
  loan_purpose TEXT NOT NULL,
  preferred_tenure TEXT NOT NULL,
  repayment_source TEXT NOT NULL,
  consent_credit_check BOOLEAN DEFAULT false,
  consent_accuracy BOOLEAN DEFAULT false,
  consent_terms BOOLEAN DEFAULT false,
  next_of_kin_name TEXT NOT NULL,
  next_of_kin_phone TEXT NOT NULL,
  next_of_kin_relationship TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_note TEXT,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES onboarding_submissions(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size INT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON customer_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON customer_invitations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_branch ON customer_invitations(branch_id);
CREATE INDEX IF NOT EXISTS idx_submissions_invitation ON onboarding_submissions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_documents_submission ON onboarding_documents(submission_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE customer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;

-- Invitations: staff see their branch (owner sees all); officers/BM/owner manage own branch.
CREATE POLICY invitations_select ON customer_invitations FOR SELECT
  USING (
    public.user_role() = 'owner'
    OR branch_id = public.user_branch()
  );

CREATE POLICY invitations_insert ON customer_invitations FOR INSERT
  WITH CHECK (
    public.user_role() IN ('owner', 'branch_manager', 'loan_officer')
    AND officer_id = auth.uid()
    AND (public.user_role() = 'owner' OR branch_id = public.user_branch())
  );

CREATE POLICY invitations_update ON customer_invitations FOR UPDATE
  USING (
    public.user_role() IN ('owner', 'branch_manager', 'loan_officer')
    AND (public.user_role() = 'owner' OR branch_id = public.user_branch())
  );

-- Submissions: staff read their branch; BM/owner update verification fields.
CREATE POLICY submissions_select ON onboarding_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_invitations i
      WHERE i.id = onboarding_submissions.invitation_id
        AND (public.user_role() = 'owner' OR i.branch_id = public.user_branch())
    )
  );

CREATE POLICY submissions_update ON onboarding_submissions FOR UPDATE
  USING (
    public.user_role() IN ('owner', 'branch_manager')
    AND EXISTS (
      SELECT 1 FROM customer_invitations i
      WHERE i.id = onboarding_submissions.invitation_id
        AND (public.user_role() = 'owner' OR i.branch_id = public.user_branch())
    )
  );

-- Documents: staff read their branch (writes go through RPCs only).
CREATE POLICY documents_select ON onboarding_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_submissions s
      JOIN customer_invitations i ON i.id = s.invitation_id
      WHERE s.id = onboarding_documents.submission_id
        AND (public.user_role() = 'owner' OR i.branch_id = public.user_branch())
    )
  );

-- ── RPC: create invitation ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_create_invitation(
  p_officer_id UUID,
  p_expiry_hours INT DEFAULT 24,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_role TEXT;
  v_branch UUID;
  v_token TEXT;
  v_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT role, branch_id INTO v_role, v_branch FROM profiles WHERE id = p_officer_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Officer profile not found.';
  END IF;
  IF v_role NOT IN ('loan_officer', 'branch_manager', 'owner') THEN
    RAISE EXCEPTION 'Only officers, branch managers and owners can create invitations.';
  END IF;
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'Officer has no branch assigned.';
  END IF;

  -- 32-char URL-safe token (24 random bytes -> 32 base64 chars, no padding).
  v_token := translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
  v_expires := now() + (GREATEST(p_expiry_hours, 1) || ' hours')::INTERVAL;

  INSERT INTO customer_invitations (token, created_by, branch_id, officer_id, customer_name, customer_phone, expires_at)
  VALUES (v_token, p_officer_id, v_branch, p_officer_id, p_customer_name, p_customer_phone, v_expires)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'token', v_token,
    'url', '/onboard/' || v_token,
    'expires_at', v_expires
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: public invitation lookup ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_get_invitation_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv customer_invitations%ROWTYPE;
  v_branch_name TEXT;
  v_officer_name TEXT;
  v_officer_phone TEXT;
BEGIN
  SELECT * INTO v_inv FROM customer_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  -- Expired or already used invitations read as NULL.
  IF v_inv.status <> 'pending' OR v_inv.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_branch_name FROM branches WHERE id = v_inv.branch_id;
  SELECT full_name, phone INTO v_officer_name, v_officer_phone FROM profiles WHERE id = v_inv.officer_id;

  RETURN jsonb_build_object(
    'id', v_inv.id,
    'customer_name', v_inv.customer_name,
    'expires_at', v_inv.expires_at,
    'branch', jsonb_build_object('id', v_inv.branch_id, 'name', v_branch_name),
    'officer', jsonb_build_object('name', v_officer_name, 'phone', v_officer_phone)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: submit onboarding ────────────────────────────────────────────────

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

  RETURN jsonb_build_object('submission_id', v_sub_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: approve onboarding ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_approve_onboarding(
  p_submission_id UUID,
  p_verifier_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_sub onboarding_submissions%ROWTYPE;
  v_inv customer_invitations%ROWTYPE;
  v_role TEXT;
  v_branch UUID;
  v_first TEXT;
  v_last TEXT;
  v_customer_id UUID;
  v_collateral_id UUID;
  v_db_type TEXT;
  v_doc onboarding_documents%ROWTYPE;
BEGIN
  SELECT role, branch_id INTO v_role, v_branch FROM profiles WHERE id = p_verifier_id;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'branch_manager') THEN
    RAISE EXCEPTION 'Only branch managers and owners can approve onboarding.';
  END IF;

  SELECT * INTO v_sub FROM onboarding_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.';
  END IF;
  SELECT * INTO v_inv FROM customer_invitations WHERE id = v_sub.invitation_id;
  IF v_inv.status <> 'submitted' THEN
    RAISE EXCEPTION 'Submission has already been processed.';
  END IF;
  IF v_role = 'branch_manager' AND v_inv.branch_id IS DISTINCT FROM v_branch THEN
    RAISE EXCEPTION 'Branch managers can only approve their own branch.';
  END IF;

  IF EXISTS (SELECT 1 FROM customers WHERE nrc_number = v_sub.nrc_or_passport) THEN
    RAISE EXCEPTION 'A customer with this ID number already exists.';
  END IF;

  v_first := split_part(TRIM(v_sub.full_name), ' ', 1);
  v_last := NULLIF(TRIM(SUBSTRING(TRIM(v_sub.full_name) FROM LENGTH(v_first) + 2)), '');
  IF v_last IS NULL THEN
    v_last := v_first;
  END IF;

  INSERT INTO customers (
    first_name, last_name, nrc_number, phone, alt_phone, email, address,
    occupation, employer_name, next_of_kin_name, next_of_kin_phone,
    next_of_kin_relationship, status, branch_id, created_by
  )
  VALUES (
    v_first, v_last, v_sub.nrc_or_passport, v_sub.phone, v_sub.alt_phone,
    v_sub.email, v_sub.address, v_sub.occupation, v_sub.employer_name,
    v_sub.next_of_kin_name, v_sub.next_of_kin_phone, v_sub.next_of_kin_relationship,
    'active', v_inv.branch_id, p_verifier_id
  )
  RETURNING id INTO v_customer_id;

  v_db_type := CASE LOWER(TRIM(v_sub.collateral_type))
    WHEN 'vehicle' THEN 'vehicle'
    WHEN 'property' THEN 'property'
    WHEN 'electronics' THEN 'electronics'
    WHEN 'appliances' THEN 'household_goods'
    WHEN 'business equipment' THEN 'equipment'
    WHEN 'equipment' THEN 'equipment'
    ELSE 'other'
  END;

  INSERT INTO collateral (
    customer_id, collateral_type, description, serial_number,
    estimated_value, location, status, created_by
  )
  VALUES (
    v_customer_id, v_db_type, v_sub.collateral_description, v_sub.collateral_serial,
    v_sub.collateral_estimated_value, v_sub.collateral_location, 'available', p_verifier_id
  )
  RETURNING id INTO v_collateral_id;

  FOR v_doc IN SELECT * FROM onboarding_documents WHERE submission_id = v_sub.id LOOP
    INSERT INTO collateral_media (collateral_id, media_type, file_name, file_path, file_size, uploaded_by)
    VALUES (
      v_collateral_id,
      CASE WHEN LOWER(v_doc.doc_type) LIKE '%photo%' OR LOWER(v_doc.doc_type) LIKE '%selfie%' OR LOWER(v_doc.doc_type) LIKE '%image%' THEN 'photo' ELSE 'document' END,
      COALESCE(v_doc.file_name, v_doc.file_path),
      v_doc.file_path,
      v_doc.file_size,
      p_verifier_id
    );
  END LOOP;

  UPDATE onboarding_submissions
  SET verified_by = p_verifier_id, verified_at = now()
  WHERE id = v_sub.id;

  UPDATE customer_invitations
  SET status = 'approved', updated_at = now()
  WHERE id = v_inv.id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    p_verifier_id, 'onboarding.approved', 'onboarding_submission', v_sub.id,
    jsonb_build_object('customer_id', v_customer_id, 'collateral_id', v_collateral_id)
  );

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: reject onboarding ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_reject_onboarding(
  p_submission_id UUID,
  p_reason TEXT,
  p_rejector_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_sub onboarding_submissions%ROWTYPE;
  v_role TEXT;
  v_branch UUID;
  v_inv_branch UUID;
BEGIN
  SELECT role, branch_id INTO v_role, v_branch FROM profiles WHERE id = p_rejector_id;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'branch_manager') THEN
    RAISE EXCEPTION 'Only branch managers and owners can reject onboarding.';
  END IF;
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'A rejection reason is required.';
  END IF;

  SELECT * INTO v_sub FROM onboarding_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.';
  END IF;
  SELECT branch_id INTO v_inv_branch FROM customer_invitations WHERE id = v_sub.invitation_id;
  IF v_role = 'branch_manager' AND v_inv_branch IS DISTINCT FROM v_branch THEN
    RAISE EXCEPTION 'Branch managers can only reject their own branch.';
  END IF;

  UPDATE onboarding_submissions
  SET verified_by = p_rejector_id, verified_at = now(), rejection_reason = TRIM(p_reason)
  WHERE id = v_sub.id;

  UPDATE customer_invitations
  SET status = 'rejected', updated_at = now()
  WHERE id = v_sub.invitation_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    p_rejector_id, 'onboarding.rejected', 'onboarding_submission', v_sub.id,
    jsonb_build_object('reason', TRIM(p_reason))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: expire stale invitations ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_expire_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE customer_invitations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Storage: private onboarding_uploads bucket ────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding_uploads', 'onboarding_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Anon may upload only under a live (pending/submitted, unexpired) invitation folder.
CREATE POLICY onboarding_uploads_anon_insert ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'onboarding_uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.customer_invitations
      WHERE status IN ('pending', 'submitted') AND expires_at > now()
    )
  );

-- Staff read; branch scoping is enforced on the metadata (submissions/documents) layer.
CREATE POLICY onboarding_uploads_staff_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'onboarding_uploads');
