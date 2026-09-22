'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserRole, canManageSettings } from '@/lib/auth';
import { parseProductForm } from '@/lib/validations/loan-product';

export interface ProductActionResult {
  ok: boolean;
  error?: string;
}

async function requireOwner() {
  const role = await getUserRole();
  if (!role || !canManageSettings(role)) {
    throw new Error('Forbidden: only the owner can manage loan products.');
  }
  const profile = await getCurrentUser();
  return profile;
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  entityId: string,
  beforeData: unknown,
  afterData: unknown,
) {
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    entity_type: 'loan_products',
    entity_id: entityId,
    before_data: beforeData ? JSON.parse(JSON.stringify(beforeData)) : null,
    after_data: afterData ? JSON.parse(JSON.stringify(afterData)) : null,
  });
}

function formError(e: unknown): ProductActionResult {
  if (e instanceof Error) {
    const issues = (e as { issues?: Array<{ message: string }> }).issues;
    if (issues && issues.length > 0) return { ok: false, error: issues.map((i) => i.message).join('; ') };
    return { ok: false, error: e.message };
  }
  return { ok: false, error: 'Something went wrong.' };
}

export async function createProduct(formData: FormData): Promise<ProductActionResult> {
  try {
    const actor = await requireOwner();
    const input = parseProductForm(formData);
    const supabase = await createClient();

    const { data: clash } = await supabase
      .from('loan_products')
      .select('id')
      .eq('code', input.code)
      .maybeSingle();
    if (clash) return { ok: false, error: `Code ${input.code} is already in use.` };

    const { data, error } = await supabase
      .from('loan_products')
      .insert({
        name: input.name,
        code: input.code,
        description: input.description || null,
        is_active: input.is_active,
        min_amount: input.min_amount,
        max_amount: input.max_amount,
        interest_rate: input.interest_rate,
        interest_type: input.interest_type,
        default_duration: input.default_duration,
        duration_unit: input.duration_unit,
        repayment_frequency: input.repayment_frequency,
        processing_fee_type: input.processing_fee_type,
        processing_fee_value: input.processing_fee_value,
        penalty_rule_type: input.penalty_rule_type,
        penalty_value: input.penalty_value,
        penalty_compounds: input.penalty_compounds,
        penalty_cap: input.penalty_cap ?? null,
        grace_period_days: input.grace_period_days,
        default_after_days: input.default_after_days,
        allocation_order: input.allocation_order,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(supabase, actor.id, 'loan_product.created', data.id, null, data);
    revalidateTag('landing-products', 'max');
    return { ok: true };
  } catch (e) {
    return formError(e);
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<ProductActionResult> {
  try {
    const actor = await requireOwner();
    const input = parseProductForm(formData);
    const supabase = await createClient();

    const { data: before } = await supabase.from('loan_products').select('*').eq('id', id).single();
    if (!before) return { ok: false, error: 'Product not found.' };

    if (input.code !== before.code) {
      const { data: clash } = await supabase
        .from('loan_products')
        .select('id')
        .eq('code', input.code)
        .maybeSingle();
      if (clash) return { ok: false, error: `Code ${input.code} is already in use.` };
    }

    const { data: after, error } = await supabase
      .from('loan_products')
      .update({
        name: input.name,
        code: input.code,
        description: input.description || null,
        is_active: input.is_active,
        min_amount: input.min_amount,
        max_amount: input.max_amount,
        interest_rate: input.interest_rate,
        interest_type: input.interest_type,
        default_duration: input.default_duration,
        duration_unit: input.duration_unit,
        repayment_frequency: input.repayment_frequency,
        processing_fee_type: input.processing_fee_type,
        processing_fee_value: input.processing_fee_value,
        penalty_rule_type: input.penalty_rule_type,
        penalty_value: input.penalty_value,
        penalty_compounds: input.penalty_compounds,
        penalty_cap: input.penalty_cap ?? null,
        grace_period_days: input.grace_period_days,
        default_after_days: input.default_after_days,
        allocation_order: input.allocation_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(supabase, actor.id, 'loan_product.updated', id, before, after);
    revalidateTag('landing-products', 'max');
    return { ok: true };
  } catch (e) {
    return formError(e);
  }
}

export async function setProductActive(id: string, active: boolean): Promise<ProductActionResult> {
  try {
    const actor = await requireOwner();
    const supabase = await createClient();

    const { data: before } = await supabase.from('loan_products').select('id, is_active').eq('id', id).single();
    if (!before) return { ok: false, error: 'Product not found.' };

    const { error } = await supabase
      .from('loan_products')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);

    await writeAudit(supabase, actor.id, active ? 'loan_product.activated' : 'loan_product.deactivated', id, before, { is_active: active });
    revalidateTag('landing-products', 'max');
    return { ok: true };
  } catch (e) {
    return formError(e);
  }
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  try {
    const actor = await requireOwner();
    const supabase = await createClient();

    const { data: before } = await supabase.from('loan_products').select('*').eq('id', id).single();
    if (!before) return { ok: false, error: 'Product not found.' };

    const { count } = await supabase.from('loans').select('id', { count: 'exact', head: true }).eq('loan_product_id', id);
    if ((count ?? 0) > 0) {
      return { ok: false, error: 'Cannot delete: loans reference this product. Deactivate it instead.' };
    }

    const { error } = await supabase.from('loan_products').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await writeAudit(supabase, actor.id, 'loan_product.deleted', id, before, null);
    revalidateTag('landing-products', 'max');
    return { ok: true };
  } catch (e) {
    return formError(e);
  }
}
