/**
 * accounts.ts — Category → CoA code mapping (Phase 9.2).
 * Defaults live here; overrides are read from the settings table
 * (keys: expense_account_map, income_account_map as JSON objects).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_EXPENSE_ACCOUNT_MAP: Record<string, string> = {
  rent: '5100',
  salaries: '5000',
  transport: '5200',
  airtime: '5500',
  utilities: '5300',
  office: '5400',
  other: '5590',
};

export const DEFAULT_INCOME_ACCOUNT_MAP: Record<string, string> = {
  interest: '4000',
  penalties: '4200',
  processing_fees: '4100',
  other: '4300',
};

export const EXPENSE_CATEGORIES = ['rent', 'salaries', 'transport', 'airtime', 'utilities', 'office', 'other'] as const;
export const INCOME_CATEGORIES = ['interest', 'penalties', 'processing_fees', 'other'] as const;

function parseMap(value: string | null, fallback: Record<string, string>): Record<string, string> {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object') return { ...fallback, ...(parsed as Record<string, string>) };
  } catch {
    // fall through to defaults
  }
  return fallback;
}

/** Load category→account maps, settings overrides merged over defaults. */
export async function loadAccountMaps(supabase: SupabaseClient): Promise<{
  expenseMap: Record<string, string>;
  incomeMap: Record<string, string>;
}> {
  const { data } = await supabase.from('settings').select('key, value').in('key', ['expense_account_map', 'income_account_map']);
  const rows = (data || []) as Array<{ key: string; value: string }>;
  const exp = rows.find((r) => r.key === 'expense_account_map')?.value ?? null;
  const inc = rows.find((r) => r.key === 'income_account_map')?.value ?? null;
  return {
    expenseMap: parseMap(exp, DEFAULT_EXPENSE_ACCOUNT_MAP),
    incomeMap: parseMap(inc, DEFAULT_INCOME_ACCOUNT_MAP),
  };
}
