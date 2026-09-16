-- Phase 1, Migration 007: Penalties
-- penalties, penalty_waivers

CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  schedule_id UUID REFERENCES loan_schedule(id),
  penalty_type TEXT NOT NULL
    CHECK (penalty_type IN ('fixed', 'percent_of_overdue', 'daily', 'weekly')),
  amount NUMERIC(18,2) NOT NULL,
  base_amount NUMERIC(18,2),
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'waived', 'paid')),
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  assessed_by UUID REFERENCES profiles(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE penalty_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_id UUID NOT NULL REFERENCES penalties(id) ON DELETE CASCADE,
  waived_amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  waived_by UUID NOT NULL REFERENCES profiles(id),
  waived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_penalties_loan ON penalties(loan_id);
CREATE INDEX idx_penalties_status ON penalties(status);
CREATE INDEX idx_penalties_calculation_date ON penalties(calculation_date);
