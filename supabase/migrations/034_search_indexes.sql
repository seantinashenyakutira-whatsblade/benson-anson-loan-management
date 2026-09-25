-- Phase F.2-3: trigram + lookup indexes for global search (/api/search).
-- Additive only (no column changes).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_nrc
  ON customers (nrc_number);
CREATE INDEX IF NOT EXISTS idx_loans_loan_no
  ON loans (loan_number);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no
  ON payments (payment_number);
