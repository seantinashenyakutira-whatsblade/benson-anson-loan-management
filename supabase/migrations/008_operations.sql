-- Phase 1, Migration 008: Operations
-- loan_officer_notes, expenses, income_records

CREATE TABLE loan_officer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  officer_id UUID NOT NULL REFERENCES profiles(id),
  note_type TEXT NOT NULL
    CHECK (note_type IN ('customer_contacted', 'promise_to_pay', 'customer_visited', 'payment_delayed', 'collateral_inspected', 'general')),
  content TEXT NOT NULL,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL
    CHECK (category IN ('rent', 'salaries', 'transport', 'airtime', 'utilities', 'office', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  branch_id UUID REFERENCES branches(id),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL
    CHECK (category IN ('interest', 'penalties', 'processing_fees', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  loan_id UUID REFERENCES loans(id),
  branch_id UUID REFERENCES branches(id),
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_officer_notes_loan ON loan_officer_notes(loan_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_income_records_category ON income_records(category);
CREATE INDEX idx_income_records_date ON income_records(income_date);
