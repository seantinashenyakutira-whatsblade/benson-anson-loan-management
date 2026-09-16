-- Phase 1, Migration 005: Products & Loans
-- loan_products, loan_applications, application_decisions, loans, loan_schedule

CREATE TABLE loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_amount NUMERIC(18,2) NOT NULL,
  max_amount NUMERIC(18,2) NOT NULL,
  interest_rate NUMERIC(8,4) NOT NULL,
  interest_type TEXT NOT NULL DEFAULT 'flat'
    CHECK (interest_type IN ('flat', 'reducing_balance')),
  default_duration INTEGER NOT NULL,
  duration_unit TEXT NOT NULL DEFAULT 'months'
    CHECK (duration_unit IN ('days', 'weeks', 'months')),
  repayment_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (repayment_frequency IN ('daily', 'weekly', 'monthly')),
  processing_fee_type TEXT NOT NULL DEFAULT 'none'
    CHECK (processing_fee_type IN ('none', 'fixed', 'percent')),
  processing_fee_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty_rule_type TEXT NOT NULL DEFAULT 'percent_of_overdue'
    CHECK (penalty_rule_type IN ('none', 'fixed', 'percent_of_overdue', 'daily', 'weekly')),
  penalty_value NUMERIC(8,4) NOT NULL DEFAULT 5,
  penalty_compounds BOOLEAN NOT NULL DEFAULT false,
  penalty_cap NUMERIC(18,2),
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  default_after_days INTEGER NOT NULL DEFAULT 30,
  allocation_order TEXT NOT NULL DEFAULT 'penalty,fee,interest,principal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  loan_product_id UUID NOT NULL REFERENCES loan_products(id),
  requested_amount NUMERIC(18,2) NOT NULL,
  approved_amount NUMERIC(18,2),
  purpose TEXT,
  duration INTEGER,
  duration_unit TEXT,
  repayment_frequency TEXT,
  officer_id UUID REFERENCES profiles(id),
  officer_recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'returned')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  return_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE application_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'returned')),
  decided_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  conditions TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number TEXT UNIQUE NOT NULL,
  application_id UUID REFERENCES loan_applications(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  loan_product_id UUID NOT NULL REFERENCES loan_products(id),
  branch_id UUID REFERENCES branches(id),
  officer_id UUID REFERENCES profiles(id),
  principal_amount NUMERIC(18,2) NOT NULL,
  interest_rate NUMERIC(8,4) NOT NULL,
  interest_type TEXT NOT NULL,
  total_interest NUMERIC(18,2) NOT NULL,
  total_fees NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_repayable NUMERIC(18,2) NOT NULL,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(18,2) NOT NULL,
  unallocated_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL,
  duration_unit TEXT NOT NULL,
  repayment_frequency TEXT NOT NULL,
  disbursement_date DATE,
  first_due_date DATE,
  maturity_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'returned', 'disbursed', 'performing', 'at_risk', 'overdue', 'defaulted', 'fully_paid', 'closed', 'collateral_released')),
  health TEXT NOT NULL DEFAULT 'performing'
    CHECK (health IN ('performing', 'at_risk', 'overdue', 'defaulted')),
  days_overdue INTEGER NOT NULL DEFAULT 0,
  arrears_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  disbursement_method TEXT,
  disbursed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loan_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  instalment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  due_amount NUMERIC(18,2) NOT NULL,
  principal_due NUMERIC(18,2) NOT NULL,
  interest_due NUMERIC(18,2) NOT NULL,
  fee_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'due', 'part_paid', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loan_id, instalment_number)
);

CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_product ON loans(loan_product_id);
CREATE INDEX idx_loans_branch ON loans(branch_id);
CREATE INDEX idx_loans_officer ON loans(officer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_health ON loans(health);
CREATE INDEX idx_loan_applications_customer ON loan_applications(customer_id);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_schedule_loan ON loan_schedule(loan_id);
CREATE INDEX idx_loan_schedule_due_date ON loan_schedule(due_date);
CREATE INDEX idx_loan_schedule_status ON loan_schedule(status);
