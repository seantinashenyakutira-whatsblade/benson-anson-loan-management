-- Phase 9.3, Migration 018: P&L and balance sheet views
-- Read-only views over posted journal lines. No column changes.

-- Monthly P&L: month, total_income, total_expense, net_profit
CREATE OR REPLACE VIEW v_pl_monthly AS
SELECT
  date_trunc('month', je.entry_date)::DATE AS month,
  COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END), 0) AS net_profit
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted'
GROUP BY 1;

-- P&L by category: account_code, account_name, type, total (signed)
CREATE OR REPLACE VIEW v_pl_by_category AS
SELECT
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type AS type,
  CASE WHEN coa.account_type = 'revenue'
    THEN COALESCE(SUM(jl.credit - jl.debit), 0)
    ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
  END AS total
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted' AND coa.account_type IN ('revenue', 'expense')
GROUP BY coa.code, coa.name, coa.account_type;

-- Balance sheet: account_code, account_name, type, balance (normal-balance sign)
CREATE OR REPLACE VIEW v_balance_sheet AS
SELECT
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type AS type,
  CASE WHEN coa.account_type IN ('liability', 'equity')
    THEN COALESCE(SUM(jl.credit - jl.debit), 0)
    ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
  END AS balance
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.status = 'posted' AND coa.account_type IN ('asset', 'liability', 'equity')
GROUP BY coa.code, coa.name, coa.account_type;
