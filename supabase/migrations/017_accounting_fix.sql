-- Phase 9.1, Migration 017: journal system-actor fallback
-- journal_entries.created_by is NOT NULL (existing column, untouched).
-- System postings (e.g. penalty accrual) pass NULL, so the helper falls
-- back to the first owner profile instead of failing.

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

  INSERT INTO journal_entries (id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, created_by)
  VALUES (v_entry_id, v_entry_number, p_entry_date, p_description, p_reference_type, p_reference_id, v_total_debit, v_total_credit, 'posted', v_actor);

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
