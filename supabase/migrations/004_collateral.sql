-- Phase 1, Migration 004: Collateral
-- collateral, collateral_media, collateral_valuations, collateral_status_history

CREATE TABLE collateral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  collateral_type TEXT NOT NULL
    CHECK (collateral_type IN ('vehicle', 'property', 'equipment', 'electronics', 'household_goods', 'other')),
  description TEXT NOT NULL,
  make_model TEXT,
  year INTEGER,
  serial_number TEXT,
  registration_number TEXT,
  estimated_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  insurance_value NUMERIC(18,2),
  condition TEXT DEFAULT 'good'
    CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'pledged', 'repossessed', 'released')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collateral_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collateral_id UUID NOT NULL REFERENCES collateral(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'photo'
    CHECK (media_type IN ('photo', 'document', 'video')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collateral_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collateral_id UUID NOT NULL REFERENCES collateral(id) ON DELETE CASCADE,
  valuer_name TEXT NOT NULL,
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valuation_amount NUMERIC(18,2) NOT NULL,
  valuation_method TEXT DEFAULT 'market_comparison'
    CHECK (valuation_method IN ('market_comparison', 'replacement_cost', 'depreciated_value', 'professional_appraisal')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collateral_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collateral_id UUID NOT NULL REFERENCES collateral(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collateral_customer ON collateral(customer_id);
CREATE INDEX idx_collateral_status ON collateral(status);
CREATE INDEX idx_collateral_media_collateral ON collateral_media(collateral_id);
CREATE INDEX idx_collateral_valuations_collateral ON collateral_valuations(collateral_id);
