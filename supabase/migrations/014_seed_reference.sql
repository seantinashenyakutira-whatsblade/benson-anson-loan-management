-- Phase 1, Migration 014: Seed Reference Data
-- Branches, loan products, permissions, role_permissions, settings, chart of accounts, document sequences

-- Branches
INSERT INTO branches (id, name, code, address, phone, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Head Office', 'HO', '123 Great East Road, Lusaka', '+260 211 250000', true),
  ('b0000000-0000-0000-0000-000000000002', 'Kabwe Branch', 'KB', '45 freedom way, Kabwe', '+260 215 220000', true),
  ('b0000000-0000-0000-0000-000000000003', 'Ndola Branch', 'ND', '78 Luanshya Road, Ndola', '+260 212 630000', true);

-- Loan Products
INSERT INTO loan_products (id, name, code, description, is_active, min_amount, max_amount, interest_rate, interest_type, default_duration, duration_unit, repayment_frequency, processing_fee_type, processing_fee_value, penalty_rule_type, penalty_value, penalty_compounds, grace_period_days, default_after_days) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Personal Loan', 'PL', 'Short-term personal loan against collateral', true, 1000, 50000, 25, 'flat', 3, 'months', 'monthly', 'percent', 5, 'percent_of_overdue', 5, false, 3, 30),
  ('a0000000-0000-0000-0000-000000000002', 'Business Loan', 'BL', 'Working capital loan for SMEs', true, 5000, 200000, 20, 'flat', 6, 'months', 'monthly', 'fixed', 500, 'daily', 2, false, 5, 45),
  ('a0000000-0000-0000-0000-000000000003', 'Salary Advance', 'SA', 'Quick advance against salary', true, 500, 15000, 15, 'flat', 1, 'months', 'monthly', 'none', 0, 'percent_of_overdue', 10, false, 2, 21);

-- Permissions (key operations)
INSERT INTO permissions (id, code, name, description) VALUES
  ('fe000000-0000-0000-0000-000000000001', 'customers.view', 'View Customers', 'View customers'),
  ('fe000000-0000-0000-0000-000000000002', 'customers.create', 'Create Customers', 'Create customers'),
  ('fe000000-0000-0000-0000-000000000003', 'customers.edit', 'Edit Customers', 'Edit customers'),
  ('fe000000-0000-0000-0000-000000000004', 'collateral.view', 'View Collateral', 'View collateral'),
  ('fe000000-0000-0000-0000-000000000005', 'collateral.create', 'Create Collateral', 'Create collateral'),
  ('fe000000-0000-0000-0000-000000000006', 'collateral.edit', 'Edit Collateral', 'Edit collateral'),
  ('fe000000-0000-0000-0000-000000000007', 'loans.view', 'View Loans', 'View loans'),
  ('fe000000-0000-0000-0000-000000000008', 'loans.create', 'Create Loan Applications', 'Create loan applications'),
  ('fe000000-0000-0000-0000-000000000009', 'loans.approve', 'Approve Loans', 'Approve loans'),
  ('fe000000-0000-0000-0000-000000000010', 'loans.disburse', 'Disburse Loans', 'Disburse loans'),
  ('fe000000-0000-0000-0000-000000000011', 'payments.view', 'View Payments', 'View payments'),
  ('fe000000-0000-0000-0000-000000000012', 'payments.record', 'Record Payments', 'Record payments'),
  ('fe000000-0000-0000-0000-000000000013', 'penalties.view', 'View Penalties', 'View penalties'),
  ('fe000000-0000-0000-0000-000000000014', 'penalties.assess', 'Assess Penalties', 'Assess penalties'),
  ('fe000000-0000-0000-0000-000000000015', 'penalties.waive', 'Waive Penalties', 'Waive penalties'),
  ('fe000000-0000-0000-0000-000000000016', 'accounting.view', 'View Accounting', 'View accounting'),
  ('fe000000-0000-0000-0000-000000000017', 'accounting.journal', 'Create Journal Entries', 'Create journal entries'),
  ('fe000000-0000-0000-0000-000000000018', 'reports.view', 'View Reports', 'View reports'),
  ('fe000000-0000-0000-0000-000000000019', 'reports.export', 'Export Reports', 'Export reports'),
  ('fe000000-0000-0000-0000-000000000020', 'users.view', 'View Users', 'View users'),
  ('fe000000-0000-0000-0000-000000000021', 'users.manage', 'Manage Users', 'Manage users'),
  ('fe000000-0000-0000-0000-000000000022', 'branches.view', 'View Branches', 'View branches'),
  ('fe000000-0000-0000-0000-000000000023', 'branches.manage', 'Manage Branches', 'Manage branches'),
  ('fe000000-0000-0000-0000-000000000024', 'settings.view', 'View Settings', 'View settings'),
  ('fe000000-0000-0000-0000-000000000025', 'settings.manage', 'Manage Settings', 'Manage settings'),
  ('fe000000-0000-0000-0000-000000000026', 'audit.view', 'View Audit Logs', 'View audit logs');

-- Role Permissions: owner gets everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', id FROM permissions;

-- Role Permissions: branch_manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'branch_manager', id FROM permissions
WHERE code IN ('customers.view', 'customers.create', 'customers.edit',
  'collateral.view', 'collateral.create', 'collateral.edit',
  'loans.view', 'loans.create', 'loans.approve', 'loans.disburse',
  'payments.view', 'payments.record',
  'penalties.view', 'penalties.assess', 'penalties.waive',
  'accounting.view', 'reports.view', 'reports.export',
  'branches.view', 'users.view');

-- Role Permissions: loan_officer
INSERT INTO role_permissions (role, permission_id)
SELECT 'loan_officer', id FROM permissions
WHERE code IN ('customers.view', 'customers.create', 'customers.edit',
  'collateral.view', 'collateral.create', 'collateral.edit',
  'loans.view', 'loans.create',
  'payments.view',
  'penalties.view');

-- Role Permissions: cashier
INSERT INTO role_permissions (role, permission_id)
SELECT 'cashier', id FROM permissions
WHERE code IN ('customers.view',
  'loans.view',
  'payments.view', 'payments.record',
  'penalties.view');

-- Settings (business defaults)
INSERT INTO settings (key, value, category, description) VALUES
  ('business_name', 'Benson Anson Loans', 'general', 'Company name'),
  ('business_phone', '+260 211 250000', 'general', 'Main phone'),
  ('business_email', 'info@bensonanson.loans', 'general', 'Main email'),
  ('business_address', '123 Great East Road, Lusaka', 'general', 'Head office address'),
  ('currency', 'ZMW', 'general', 'Default currency'),
  ('currency_symbol', 'K', 'general', 'Currency symbol'),
  ('default_interest_rate', '25', 'lending', 'Default interest rate (%)'),
  ('max_approval_amount', '50000', 'lending', 'Max amount branch manager can approve'),
  ('grace_period_days', '3', 'lending', 'Default grace period'),
  ('default_after_days', '30', 'lending', 'Default after days'),
  ('late_penalty_rate', '5', 'lending', 'Late penalty rate (%)'),
  ('penalty_cap_amount', '500', 'lending', 'Maximum penalty amount'),
  ('enable_mobile_money', 'true', 'payment', 'Enable mobile money payments'),
  ('enable_cash_payments', 'true', 'payment', 'Enable cash payments'),
  ('enable_bank_transfer', 'true', 'payment', 'Enable bank transfers'),
  ('receipt_footer', 'Thank you for your payment. Benson Anson Loans.', 'branding', 'Receipt footer message'),
  ('theme_primary_color', '#0A1834', 'branding', 'Primary brand color'),
  ('theme_accent_color', '#C8B6F0', 'branding', 'Accent color');

-- Chart of Accounts (standard lending chart)
INSERT INTO chart_of_accounts (id, code, name, account_type) VALUES
  ('ca000000-0000-0000-0000-000000000001', '1000', 'Cash', 'asset'),
  ('ca000000-0000-0000-0000-000000000002', '1010', 'Petty Cash', 'asset'),
  ('ca000000-0000-0000-0000-000000000003', '1100', 'Accounts Receivable', 'asset'),
  ('ca000000-0000-0000-0000-000000000004', '1200', 'Loan Portfolio', 'asset'),
  ('ca000000-0000-0000-0000-000000000005', '1210', 'Accrued Interest', 'asset'),
  ('ca000000-0000-0000-0000-000000000006', '1300', 'Collateral Held', 'asset'),
  ('ca000000-0000-0000-0000-000000000007', '2000', 'Accounts Payable', 'liability'),
  ('ca000000-0000-0000-0000-000000000008', '2100', 'Deposits Held', 'liability'),
  ('ca000000-0000-0000-0000-000000000009', '3000', 'Owner Equity', 'equity'),
  ('ca000000-0000-0000-0000-000000000010', '4000', 'Interest Income', 'revenue'),
  ('ca000000-0000-0000-0000-000000000011', '4100', 'Fee Income', 'revenue'),
  ('ca000000-0000-0000-0000-000000000012', '4200', 'Penalty Income', 'revenue'),
  ('ca000000-0000-0000-0000-000000000013', '5000', 'Salaries Expense', 'expense'),
  ('ca000000-0000-0000-0000-000000000014', '5100', 'Rent Expense', 'expense'),
  ('ca000000-0000-0000-0000-000000000015', '5200', 'Transport Expense', 'expense'),
  ('ca000000-0000-0000-0000-000000000016', '5300', 'Utilities Expense', 'expense'),
  ('ca000000-0000-0000-0000-000000000017', '5400', 'Office Expense', 'expense'),
  ('ca000000-0000-0000-0000-000000000018', '5500', 'Airtime Expense', 'expense');

-- Document Sequences
INSERT INTO document_sequences (document_type, prefix, next_number, padding) VALUES
  ('loan', 'LN', 1001, 6),
  ('application', 'AP', 1001, 6),
  ('payment', 'PY', 1001, 6),
  ('receipt', 'RC', 1001, 6),
  ('journal', 'JE', 1001, 6);
