-- Phase 1, Migration 003: Customers
-- customers, customer_documents

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nrc_number TEXT UNIQUE,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT DEFAULT 'Lusaka',
  province TEXT DEFAULT 'Lusaka',
  occupation TEXT,
  employer_name TEXT,
  next_of_kin_name TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_relationship TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blacklisted')),
  branch_id UUID REFERENCES branches(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('nrc_front', 'nrc_back', 'payslip', 'bank_statement', 'utility_bill', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_nrc ON customers(nrc_number);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_branch ON customers(branch_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customer_documents_customer ON customer_documents(customer_id);
