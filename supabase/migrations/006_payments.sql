-- Phase 1, Migration 006: Payments
-- payments, payment_allocations, payment_adjustments

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  loan_id UUID NOT NULL REFERENCES loans(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount NUMERIC(18,2) NOT NULL,
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('cash', 'airtel_money', 'mtn_mobile_money', 'bank_transfer', 'other')),
  reference_number TEXT,
  proof_url TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'verified'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES loans(id),
  schedule_id UUID REFERENCES loan_schedule(id),
  amount NUMERIC(18,2) NOT NULL,
  component TEXT NOT NULL
    CHECK (component IN ('penalty', 'fee', 'interest', 'principal', 'unallocated')),
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('reversal', 'correction')),
  amount NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID NOT NULL REFERENCES profiles(id),
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_loan ON payments(loan_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_loan ON payment_allocations(loan_id);
CREATE INDEX idx_payment_allocations_schedule ON payment_allocations(schedule_id);
