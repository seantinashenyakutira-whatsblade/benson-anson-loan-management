-- Stage 2, Migration 024: permission matrix overrides
-- Adds the UI-layer permission codes, seeds role_permissions for the three
-- non-owner roles from the code defaults, and exposes them via RPC.
-- Owner always has full access in code; RLS policies are untouched.

ALTER TABLE permissions ADD COLUMN IF NOT EXISTS overridden BOOLEAN NOT NULL DEFAULT false;

-- UI-layer codes missing from the Phase 1 seed
INSERT INTO permissions (code, name, description) VALUES
  ('customers.*', 'Customers (all)', 'Full customer access'),
  ('customers.edit_own', 'Edit Own Customers', 'Edit customers you created'),
  ('collateral.*', 'Collateral (all)', 'Full collateral access'),
  ('applications.*', 'Applications (all)', 'Full application access'),
  ('applications.create', 'Create Applications', 'Create loan applications'),
  ('applications.view_own', 'View Own Applications', 'View own applications'),
  ('applications.submit', 'Submit Applications', 'Submit drafts for review'),
  ('applications.approve', 'Approve Applications', 'Approve or reject applications'),
  ('loans.view_own', 'View Own Loans', 'View assigned loans'),
  ('loans.disburse', 'Disburse Loans', 'Disburse approved loans'),
  ('loans.*', 'Loans (all)', 'Full loan access'),
  ('collections.*', 'Collections (all)', 'Full collections access'),
  ('payments.create', 'Record Payments', 'Record loan payments'),
  ('payments.reverse', 'Reverse Payments', 'Reverse a recorded payment'),
  ('accounting.*', 'Accounting (all)', 'Full accounting access'),
  ('settings.view', 'View Settings', 'Read business settings'),
  ('invitations.create', 'Create Invitations', 'Invite customers'),
  ('invitations.approve', 'Approve Invitations', 'Approve invitations'),
  ('invitations.view_own', 'View Own Invitations', 'View own invitations'),
  ('staff.view', 'View Staff', 'View staff list'),
  ('leads.*', 'Leads (all)', 'Full lead access'),
  ('leads.view_own', 'View Own Leads', 'View assigned leads'),
  ('chat.*', 'Chat (all)', 'Team chat access'),
  ('profile.self', 'Own Profile', 'Manage own profile'),
  ('notes.create', 'Create Notes', 'Add officer notes'),
  ('notes.view_own', 'View Own Notes', 'View own officer notes'),
  ('receipts.print', 'Print Receipts', 'Print payment receipts'),
  ('expenses.create', 'Record Expenses', 'Record business expenses'),
  ('expenses.view', 'View Expenses', 'View expenses')
ON CONFLICT (code) DO NOTHING;

-- Seed role_permissions from the code defaults (idempotent)
INSERT INTO role_permissions (role, permission_id)
SELECT 'branch_manager', p.id FROM permissions p
WHERE p.code IN (
  'customers.*', 'collateral.*', 'loans.*', 'applications.*', 'payments.*',
  'penalties.view', 'penalties.waive', 'collections.*', 'accounting.*',
  'reports.view', 'reports.export', 'settings.view',
  'invitations.create', 'invitations.approve', 'staff.view',
  'leads.*', 'chat.*', 'profile.self'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'loan_officer', p.id FROM permissions p
WHERE p.code IN (
  'customers.create', 'customers.view', 'customers.edit_own',
  'collateral.create', 'collateral.view',
  'applications.create', 'applications.view_own',
  'loans.view_own', 'collections.*',
  'notes.create', 'notes.view_own',
  'invitations.create', 'invitations.view_own',
  'leads.view_own', 'chat.*', 'profile.self'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'cashier', p.id FROM permissions p
WHERE p.code IN (
  'customers.view', 'loans.view',
  'payments.create', 'payments.view', 'payments.reverse',
  'receipts.print', 'expenses.create', 'expenses.view',
  'accounting.view', 'chat.*', 'profile.self'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Read a role's UI permissions as a JSON array of codes
CREATE OR REPLACE FUNCTION rpc_get_role_permissions(p_role TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(p.code ORDER BY p.code)
     FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role = p_role),
    '[]'::JSONB
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_get_role_permissions(TEXT) TO authenticated;
