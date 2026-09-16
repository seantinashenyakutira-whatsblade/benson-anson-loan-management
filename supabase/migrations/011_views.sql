-- Phase 1, Migration 011: Views
-- Position calculations, rollups, dashboard KPIs

-- Loan position view (per-loan)
CREATE OR REPLACE VIEW v_loan_position AS
SELECT
  l.id AS loan_id,
  l.loan_number,
  l.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  l.branch_id,
  b.name AS branch_name,
  l.officer_id,
  p.full_name AS officer_name,
  l.loan_product_id,
  lp.name AS product_name,
  l.principal_amount,
  l.total_repayable,
  l.outstanding_balance,
  l.amount_paid,
  l.unallocated_credit,
  l.disbursement_date,
  l.maturity_date,
  l.status,
  l.health,
  l.days_overdue,
  l.arrears_amount,
  COALESCE(s.total_due, 0) AS amount_due_to_date,
  COALESCE(pa.total_paid, 0) AS amount_paid_to_date,
  GREATEST(COALESCE(s.total_due, 0) - COALESCE(pa.total_paid, 0), 0) AS collection_shortfall,
  COALESCE(ar.total_arrears, 0) AS arrears,
  COALESCE(pen.total_penalties, 0) AS penalties_due,
  COALESCE(pen_paid.total_paid, 0) AS penalties_paid,
  s.next_due_date,
  l.created_at
FROM loans l
JOIN customers c ON c.id = l.customer_id
LEFT JOIN branches b ON b.id = l.branch_id
LEFT JOIN profiles p ON p.id = l.officer_id
LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
LEFT JOIN (
  SELECT loan_id, SUM(due_amount) AS total_due,
    MIN(CASE WHEN status != 'paid' THEN due_date END) AS next_due_date
  FROM loan_schedule
  GROUP BY loan_id
) s ON s.loan_id = l.id
LEFT JOIN (
  SELECT loan_id, SUM(amount) AS total_paid
  FROM payment_allocations
  WHERE allocation_date <= CURRENT_DATE
  GROUP BY loan_id
) pa ON pa.loan_id = l.id
LEFT JOIN (
  SELECT loan_id, SUM(remaining) AS total_arrears
  FROM loan_schedule
  WHERE due_date + INTERVAL '1 day' * 3 < CURRENT_DATE
    AND status != 'paid'
  GROUP BY loan_id
) ar ON ar.loan_id = l.id
LEFT JOIN (
  SELECT loan_id, SUM(amount - paid_amount) AS total_penalties
  FROM penalties
  WHERE status = 'active'
  GROUP BY loan_id
) pen ON pen.loan_id = l.id
LEFT JOIN (
  SELECT loan_id, SUM(paid_amount) AS total_paid
  FROM penalties
  WHERE status IN ('paid', 'waived')
  GROUP BY loan_id
) pen_paid ON pen_paid.loan_id = l.id;

-- Customer position view
CREATE OR REPLACE VIEW v_customer_position AS
SELECT
  c.id AS customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.phone,
  c.nrc_number,
  c.branch_id,
  b.name AS branch_name,
  COUNT(DISTINCT l.id) AS total_loans,
  COUNT(DISTINCT CASE WHEN l.status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted') THEN l.id END) AS active_loans,
  COALESCE(SUM(l.principal_amount), 0) AS total_borrowed,
  COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding,
  COALESCE(SUM(l.amount_paid), 0) AS total_paid,
  COALESCE(SUM(l.arrears_amount), 0) AS total_arrears,
  MAX(l.created_at) AS last_loan_date
FROM customers c
LEFT JOIN branches b ON b.id = c.branch_id
LEFT JOIN loans l ON l.customer_id = c.id
GROUP BY c.id, c.first_name, c.last_name, c.phone, c.nrc_number, c.branch_id, b.name;

-- Branch performance view
CREATE OR REPLACE VIEW v_branch_performance AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.code AS branch_code,
  COUNT(DISTINCT l.id) AS total_loans,
  COUNT(DISTINCT CASE WHEN l.status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted') THEN l.id END) AS active_loans,
  COALESCE(SUM(l.principal_amount), 0) AS total_disbursed,
  COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding,
  COALESCE(SUM(l.amount_paid), 0) AS total_collected,
  GREATEST(
    COALESCE((SELECT SUM(ls.due_amount) FROM loan_schedule ls JOIN loans ll ON ll.id = ls.loan_id WHERE ll.branch_id = b.id AND ls.due_date <= CURRENT_DATE), 0)
    - COALESCE(SUM(l.amount_paid), 0),
    0
  ) AS shortfall,
  COUNT(DISTINCT CASE WHEN l.health = 'performing' THEN l.id END) AS performing_count,
  COUNT(DISTINCT CASE WHEN l.health = 'at_risk' THEN l.id END) AS at_risk_count,
  COUNT(DISTINCT CASE WHEN l.health = 'overdue' THEN l.id END) AS overdue_count,
  COUNT(DISTINCT CASE WHEN l.health = 'defaulted' THEN l.id END) AS defaulted_count,
  COUNT(DISTINCT p.id) AS officer_count
FROM branches b
LEFT JOIN loans l ON l.branch_id = b.id
LEFT JOIN profiles p ON p.branch_id = b.id AND p.role = 'loan_officer'
WHERE b.is_active = true
GROUP BY b.id, b.name, b.code;

-- Officer performance view
CREATE OR REPLACE VIEW v_officer_performance AS
SELECT
  p.id AS officer_id,
  p.full_name AS officer_name,
  p.branch_id,
  b.name AS branch_name,
  COUNT(DISTINCT l.id) AS total_loans,
  COUNT(DISTINCT CASE WHEN l.status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted') THEN l.id END) AS active_loans,
  COALESCE(SUM(l.principal_amount), 0) AS total_disbursed,
  COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding,
  COALESCE(SUM(l.amount_paid), 0) AS total_collected,
  COUNT(DISTINCT CASE WHEN l.health = 'performing' THEN l.id END) AS performing_count,
  COUNT(DISTINCT CASE WHEN l.health = 'at_risk' THEN l.id END) AS at_risk_count,
  COUNT(DISTINCT CASE WHEN l.health = 'overdue' THEN l.id END) AS overdue_count,
  COUNT(DISTINCT CASE WHEN l.health = 'defaulted' THEN l.id END) AS defaulted_count
FROM profiles p
LEFT JOIN branches b ON b.id = p.branch_id
LEFT JOIN loans l ON l.officer_id = p.id
WHERE p.role = 'loan_officer' AND p.is_active = true
GROUP BY p.id, p.full_name, p.branch_id, b.name;

-- Daily collection summary view
CREATE OR REPLACE VIEW v_daily_collection_summary AS
SELECT
  pa.allocation_date AS collection_date,
  l.branch_id,
  b.name AS branch_name,
  l.officer_id,
  pf.full_name AS officer_name,
  COUNT(DISTINCT pa.payment_id) AS payment_count,
  SUM(CASE WHEN pa.component = 'principal' THEN pa.amount ELSE 0 END) AS principal_collected,
  SUM(CASE WHEN pa.component = 'interest' THEN pa.amount ELSE 0 END) AS interest_collected,
  SUM(CASE WHEN pa.component = 'fee' THEN pa.amount ELSE 0 END) AS fees_collected,
  SUM(CASE WHEN pa.component = 'penalty' THEN pa.amount ELSE 0 END) AS penalties_collected,
  SUM(pa.amount) AS total_collected
FROM payment_allocations pa
JOIN loans l ON l.id = pa.loan_id
LEFT JOIN branches b ON b.id = l.branch_id
LEFT JOIN profiles pf ON pf.id = l.officer_id
GROUP BY pa.allocation_date, l.branch_id, b.name, l.officer_id, pf.full_name;

-- Dashboard KPIs view (company-wide)
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status NOT IN ('draft', 'submitted', 'under_review', 'rejected', 'returned')) AS total_disbursed,
  (SELECT COALESCE(SUM(outstanding_balance), 0) FROM loans WHERE status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS total_outstanding,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM loans WHERE status NOT IN ('draft', 'submitted', 'under_review', 'rejected', 'returned')) AS total_collected,
  (SELECT COALESCE(SUM(due_amount), 0) FROM loan_schedule WHERE due_date <= CURRENT_DATE) AS expected_to_date,
  GREATEST(
    (SELECT COALESCE(SUM(due_amount), 0) FROM loan_schedule WHERE due_date <= CURRENT_DATE)
    - (SELECT COALESCE(SUM(amount_paid), 0) FROM loans WHERE status NOT IN ('draft', 'submitted', 'under_review', 'rejected', 'returned')),
    0
  ) AS shortfall,
  (SELECT COALESCE(SUM(amount - paid_amount), 0) FROM penalties WHERE status = 'active') AS penalties_due,
  (SELECT COUNT(DISTINCT id) FROM loans WHERE health = 'performing' AND status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS performing_count,
  (SELECT COUNT(DISTINCT id) FROM loans WHERE health = 'at_risk' AND status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS at_risk_count,
  (SELECT COUNT(DISTINCT id) FROM loans WHERE health = 'overdue' AND status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS overdue_count,
  (SELECT COUNT(DISTINCT id) FROM loans WHERE health = 'defaulted' AND status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS defaulted_count,
  (SELECT COUNT(DISTINCT id) FROM customers WHERE status = 'active') AS active_customers,
  (SELECT COUNT(DISTINCT id) FROM loans WHERE status IN ('disbursed', 'performing', 'at_risk', 'overdue', 'defaulted')) AS active_loans;
