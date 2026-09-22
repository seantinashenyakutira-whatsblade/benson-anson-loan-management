'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, FileUp, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ID_TYPES,
  COLLATERAL_TYPES,
  STEP_COUNT,
  progressPercent,
  repaymentEstimate,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step7Schema,
  tenureLabel,
  type OnboardProduct,
} from '@/lib/validations/onboarding';

export interface InvitationInfo {
  id: string;
  customer_name: string | null;
  expires_at: string;
  branch: { id: string; name: string | null };
  officer: { name: string | null; phone: string | null };
}

interface StoredUpload {
  path: string;
  name: string;
  size: number;
  doc_type: string;
}

type Values = Record<string, string | boolean | undefined>;

interface UploadState {
  selfie: StoredUpload | null;
  bank: StoredUpload[];
  photos: StoredUpload[];
  ownership: StoredUpload[];
  extra: StoredUpload[];
}

const EMPTY_UPLOADS: UploadState = { selfie: null, bank: [], photos: [], ownership: [], extra: [] };

const inputCls =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#f5b300] focus:outline-none';
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-200';
const errCls = 'mt-1 text-sm text-red-400';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div data-field={error ? 'error' : undefined}>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
}

function fmtK(n: number): string {
  return 'K ' + Number(n).toLocaleString('en-ZM', { maximumFractionDigits: 2 });
}

export function OnboardForm({ token, invitation, products }: { token: string; invitation: InvitationInfo; products: OnboardProduct[] }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Values>({ nationality: 'Zambian' });
  const [uploads, setUploads] = useState<UploadState>(EMPTY_UPLOADS);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restored = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const storeKey = `onboard:${token}`;

  const set = useCallback((k: string, v: string | boolean | undefined) => {
    setValues((prev) => ({ ...prev, [k]: v }));
  }, []);
  const get = useCallback((k: string): string => {
    const v = values[k];
    return typeof v === 'string' ? v : '';
  }, [values]);

  // Restore progress once (deferred so the first paint stays hydration-safe).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storeKey);
        if (raw) {
          const saved = JSON.parse(raw) as { step?: number; values?: Values; uploads?: UploadState };
          if (saved.values) setValues((prev) => ({ ...prev, ...saved.values }));
          if (saved.uploads) setUploads({ ...EMPTY_UPLOADS, ...saved.uploads });
          if (saved.step && saved.step >= 1 && saved.step <= STEP_COUNT) setStep(saved.step);
        } else if (invitation.customer_name) {
          setValues((prev) => (prev.full_name ? prev : { ...prev, full_name: invitation.customer_name ?? '' }));
        }
      } catch {
        /* corrupted state: start fresh */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress (debounced).
  useEffect(() => {
    if (!restored.current || done) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storeKey, JSON.stringify({ step, values, uploads }));
      } catch {
        /* storage full/blocked: non-fatal */
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [step, values, uploads, done, storeKey]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === get('tenure_product_id')) ?? null,
    [products, get],
  );

  async function uploadOne(file: File, docType: string, maxMb: number): Promise<StoredUpload | null> {
    if (file.size > maxMb * 1024 * 1024) {
      setErrors((e) => ({ ...e, _upload: `${file.name} exceeds ${maxMb}MB.` }));
      return null;
    }
    setUploading(true);
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${token}/${Date.now()}-${clean}`;
    const { error } = await supabase.storage.from('onboarding_uploads').upload(path, file);
    setUploading(false);
    if (error) {
      setErrors((e) => ({ ...e, _upload: `Upload failed: ${error.message}` }));
      return null;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next._upload;
      return next;
    });
    return { path, name: file.name, size: file.size, doc_type: docType };
  }

  function removeUpload(slot: keyof UploadState, path: string) {
    setUploads((u) => {
      if (slot === 'selfie') return { ...u, selfie: null };
      return { ...u, [slot]: (u[slot] as StoredUpload[]).filter((f) => f.path !== path) };
    });
  }

  function fail(errs: Record<string, string>) {
    setErrors(errs);
    requestAnimationFrame(() => {
      document.querySelector('[data-field="error"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    const pick = (keys: string[]) => {
      const o: Record<string, unknown> = {};
      for (const k of keys) o[k] = values[k];
      return o;
    };
    const apply = (parsed: { success: boolean; error?: unknown }) => {
      if (!parsed.success && parsed.error && typeof parsed.error === 'object' && 'issues' in parsed.error) {
        const issues = (parsed.error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
        for (const i of issues) {
          const k = String(i.path[0] ?? 'form');
          if (!errs[k]) errs[k] = i.message;
        }
      }
      return parsed.success;
    };

    if (s === 1) {
      apply(
        step1Schema.safeParse(
          pick(['full_name', 'date_of_birth', 'national_id_type', 'nrc_or_passport', 'phone', 'alt_phone', 'email', 'address', 'residence_type', 'marital_status', 'nationality', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship']),
        ),
      );
      if (!uploads.selfie) errs.selfie = 'Please take a selfie photo.';
    } else if (s === 2) {
      apply(
        step2Schema.safeParse(
          pick(['occupation', 'employer_name', 'employer_address', 'job_title', 'employment_duration_months', 'monthly_income', 'other_income']),
        ),
      );
    } else if (s === 3) {
      apply(step3Schema.safeParse(pick(['existing_loans', 'assets_description'])));
      if (uploads.bank.length > 5) errs.bank = 'Maximum 5 bank statements.';
    } else if (s === 4) {
      apply(
        step4Schema.safeParse(
          pick(['collateral_type', 'collateral_description', 'collateral_estimated_value', 'collateral_ownership', 'collateral_location', 'collateral_serial']),
        ),
      );
      if (uploads.photos.length < 2) errs.photos = 'Add at least 2 photos of the item.';
      else if (uploads.photos.length > 6) errs.photos = 'Maximum 6 photos.';
      if (uploads.ownership.length < 1) errs.ownership = 'Add at least one ownership document.';
      else if (uploads.ownership.length > 3) errs.ownership = 'Maximum 3 ownership documents.';
    } else if (s === 5) {
      const ok = apply(
        step5Schema.safeParse(pick(['loan_amount_requested', 'loan_purpose', 'preferred_tenure', 'repayment_source'])),
      );
      if (ok && selectedProduct) {
        const amt = Number(values.loan_amount_requested);
        if (amt < selectedProduct.min_amount || amt > selectedProduct.max_amount) {
          errs.loan_amount_requested = `This product covers ${fmtK(selectedProduct.min_amount)} – ${fmtK(selectedProduct.max_amount)}.`;
        }
      }
    } else if (s === 7) {
      apply(
        step7Schema.safeParse({
          consent_credit_check: values.consent_credit_check === true,
          consent_accuracy: values.consent_accuracy === true,
          consent_terms: values.consent_terms === true,
        }),
      );
    }

    if (Object.keys(errs).length > 0) {
      fail(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEP_COUNT, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseTenure(productId: string) {
    const p = products.find((x) => x.id === productId) ?? null;
    set('tenure_product_id', productId);
    if (p) {
      set('preferred_tenure', tenureLabel(p));
      const amt = Number(values.loan_amount_requested);
      if (!amt || amt < p.min_amount || amt > p.max_amount) {
        set('loan_amount_requested', String(p.min_amount));
      }
    } else {
      set('preferred_tenure', '');
    }
  }

  const estimate = useMemo(() => {
    const amt = Number(values.loan_amount_requested);
    if (!selectedProduct || !amt || amt <= 0) return null;
    return repaymentEstimate(amt, Number(selectedProduct.interest_rate), selectedProduct.default_duration, selectedProduct.duration_unit, selectedProduct.repayment_frequency);
  }, [values.loan_amount_requested, selectedProduct]);

  async function submit() {
    if (!validateStep(7)) return;
    setSubmitting(true);
    setSubmitError(null);
    const docs: StoredUpload[] = [
      ...(uploads.selfie ? [uploads.selfie] : []),
      ...uploads.bank,
      ...uploads.photos,
      ...uploads.ownership,
      ...uploads.extra,
    ];
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (k === 'tenure_product_id') continue;
      data[k] = v ?? '';
    }
    const { error } = await supabase.rpc('rpc_submit_onboarding', {
      p_token: token,
      p_data: data,
      p_document_paths: docs.map((d) => ({ doc_type: d.doc_type, file_path: d.path, file_name: d.name, file_size: d.size })),
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    try {
      localStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A1834] p-4">
        <div className="glass-card w-full max-w-md p-8 text-center">
          <CheckCircle2 size={56} className="mx-auto text-green-400" />
          <h1 className="mt-4 text-2xl font-bold text-white">Application submitted</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Your loan officer {invitation.officer.name || 'will contact you'}
            {invitation.officer.phone ? ` on ${invitation.officer.phone}` : ''} within 24 hours.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-400">Reference: {token}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#f5b300] px-6 py-3 text-sm font-bold text-[#0A1834]"
          >
            Return to website
          </Link>
        </div>
      </div>
    );
  }

  const pct = progressPercent(step);

  return (
    <div className="min-h-dvh bg-[#0A1834] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#f5b300]">Anson Benson Cash Solutions</p>
        <h1 className="mt-1 text-center text-xl font-bold text-white sm:text-2xl">Loan Application</h1>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Step {step} of {STEP_COUNT}</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-2 flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEP_COUNT}>
            {Array.from({ length: STEP_COUNT }, (_, i) => {
              const n = i + 1;
              return (
                <div
                  key={n}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    n < step ? 'bg-[#f5b300]' : n === step ? 'animate-pulse border border-[#f5b300] bg-[#f5b300]/60' : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="glass-card mt-5 space-y-5 p-5 sm:p-7" key={step}>
          {step === 1 && (
            <>
              <Field label="Full name *" error={errors.full_name}>
                <input value={get('full_name')} onChange={(e) => set('full_name', e.target.value)} className={inputCls} placeholder="e.g. Mutinta Phiri" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth *" error={errors.date_of_birth}>
                  <input type="date" value={get('date_of_birth')} onChange={(e) => set('date_of_birth', e.target.value)} className={inputCls} />
                </Field>
                <Field label="National ID type *" error={errors.national_id_type}>
                  <select value={get('national_id_type')} onChange={(e) => set('national_id_type', e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="ID number *" error={errors.nrc_or_passport}>
                <input value={get('nrc_or_passport')} onChange={(e) => set('nrc_or_passport', e.target.value)} className={inputCls} placeholder="123456/78/9" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone *" error={errors.phone}>
                  <input type="tel" value={get('phone')} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="+2609XXXXXXXX" />
                </Field>
                <Field label="Alternate phone" error={errors.alt_phone}>
                  <input type="tel" value={get('alt_phone')} onChange={(e) => set('alt_phone', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Email" error={errors.email}>
                <input type="email" value={get('email')} onChange={(e) => set('email', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Home address *" error={errors.address}>
                <textarea value={get('address')} onChange={(e) => set('address', e.target.value)} rows={2} className={inputCls} placeholder="Plot, street, area, town" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Residence type *" error={errors.residence_type}>
                  <select value={get('residence_type')} onChange={(e) => set('residence_type', e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {['Owned', 'Rented', 'Family', 'Other'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Marital status" error={errors.marital_status}>
                  <select value={get('marital_status')} onChange={(e) => set('marital_status', e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {['Single', 'Married', 'Divorced', 'Widowed'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Nationality" error={errors.nationality}>
                <input value={get('nationality') || 'Zambian'} onChange={(e) => set('nationality', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Next of kin name *" error={errors.next_of_kin_name}>
                  <input value={get('next_of_kin_name')} onChange={(e) => set('next_of_kin_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Next of kin phone *" error={errors.next_of_kin_phone}>
                  <input type="tel" value={get('next_of_kin_phone')} onChange={(e) => set('next_of_kin_phone', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Next of kin relationship" error={errors.next_of_kin_relationship}>
                <select value={get('next_of_kin_relationship')} onChange={(e) => set('next_of_kin_relationship', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Selfie photo *" error={errors.selfie}>
                {uploads.selfie ? (
                  <UploadedRow file={uploads.selfie} onRemove={() => removeUpload('selfie', uploads.selfie!.path)} />
                ) : (
                  <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-slate-300">
                    <Camera size={18} />
                    {uploading ? 'Uploading…' : 'Take / choose selfie (max 5MB)'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const up = await uploadOne(f, 'selfie', 5);
                        if (up) setUploads((u) => ({ ...u, selfie: up }));
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Occupation *" error={errors.occupation}>
                <input value={get('occupation')} onChange={(e) => set('occupation', e.target.value)} className={inputCls} placeholder="e.g. Teacher, Trader, Driver" />
              </Field>
              <Field label="Employer name" error={errors.employer_name}>
                <input value={get('employer_name')} onChange={(e) => set('employer_name', e.target.value)} className={inputCls} placeholder="Required if employed" />
              </Field>
              <Field label="Employer address" error={errors.employer_address}>
                <textarea value={get('employer_address')} onChange={(e) => set('employer_address', e.target.value)} rows={2} className={inputCls} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Job title" error={errors.job_title}>
                  <input value={get('job_title')} onChange={(e) => set('job_title', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Employment duration (months) *" error={errors.employment_duration_months}>
                  <input type="number" min={0} max={600} value={get('employment_duration_months')} onChange={(e) => set('employment_duration_months', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Monthly income (ZMW) *" error={errors.monthly_income}>
                <input type="number" min={500} step="0.01" value={get('monthly_income')} onChange={(e) => set('monthly_income', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Other sources of income" error={errors.other_income}>
                <textarea value={get('other_income')} onChange={(e) => set('other_income', e.target.value)} rows={2} className={inputCls} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Existing loans or debts" error={errors.existing_loans}>
                <textarea value={get('existing_loans')} onChange={(e) => set('existing_loans', e.target.value)} rows={3} className={inputCls} placeholder="Lender, balance, monthly payment…" />
              </Field>
              <Field label="Assets description" error={errors.assets_description}>
                <textarea value={get('assets_description')} onChange={(e) => set('assets_description', e.target.value)} rows={3} className={inputCls} placeholder="What you own of value…" />
              </Field>
              <Field label="Bank statements (last 3 months, up to 5 files)" error={errors.bank}>
                <MultiUpload
                  files={uploads.bank}
                  disabled={uploading || uploads.bank.length >= 5}
                  accept="*"
                  onPick={async (f) => {
                    const up = await uploadOne(f, 'bank_statement', 10);
                    if (up) setUploads((u) => ({ ...u, bank: [...u.bank, up] }));
                  }}
                  onRemove={(p) => removeUpload('bank', p)}
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Collateral type *" error={errors.collateral_type}>
                <select value={get('collateral_type')} onChange={(e) => set('collateral_type', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {COLLATERAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Description * (20–500 characters)" error={errors.collateral_description}>
                <textarea value={get('collateral_description')} onChange={(e) => set('collateral_description', e.target.value)} rows={3} className={inputCls} placeholder="Make, model, condition, distinguishing marks…" />
              </Field>
              <Field label="Estimated market value (ZMW) *" error={errors.collateral_estimated_value}>
                <input type="number" min={500} step="0.01" value={get('collateral_estimated_value')} onChange={(e) => set('collateral_estimated_value', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Ownership information *" error={errors.collateral_ownership}>
                <textarea value={get('collateral_ownership')} onChange={(e) => set('collateral_ownership', e.target.value)} rows={2} className={inputCls} placeholder="Who bought it, when, papers held…" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Location" error={errors.collateral_location}>
                  <input value={get('collateral_location')} onChange={(e) => set('collateral_location', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Serial / chassis / reference" error={errors.collateral_serial}>
                  <input value={get('collateral_serial')} onChange={(e) => set('collateral_serial', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Photos * (2–6, max 5MB each)" error={errors.photos}>
                <MultiUpload
                  files={uploads.photos}
                  disabled={uploading || uploads.photos.length >= 6}
                  accept="image/*"
                  capture
                  onPick={async (f) => {
                    const up = await uploadOne(f, 'collateral_photo', 5);
                    if (up) setUploads((u) => ({ ...u, photos: [...u.photos, up] }));
                  }}
                  onRemove={(p) => removeUpload('photos', p)}
                />
              </Field>
              <Field label="Ownership documents * (up to 3)" error={errors.ownership}>
                <MultiUpload
                  files={uploads.ownership}
                  disabled={uploading || uploads.ownership.length >= 3}
                  accept="*"
                  onPick={async (f) => {
                    const up = await uploadOne(f, 'ownership_doc', 10);
                    if (up) setUploads((u) => ({ ...u, ownership: [...u.ownership, up] }));
                  }}
                  onRemove={(p) => removeUpload('ownership', p)}
                />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <Field label="Preferred repayment tenure *" error={errors.preferred_tenure}>
                <select value={get('tenure_product_id')} onChange={(e) => chooseTenure(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {tenureLabel(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Loan amount requested (ZMW) *" error={errors.loan_amount_requested}>
                <input type="number" min={500} step="0.01" value={get('loan_amount_requested')} onChange={(e) => set('loan_amount_requested', e.target.value)} className={inputCls} />
              </Field>
              {estimate && selectedProduct && (
                <div className="rounded-xl border border-[#f5b300]/40 bg-[#f5b300]/10 p-4 text-sm text-slate-100">
                  You will repay: <strong>{fmtK(estimate.total)}</strong> total.
                  <br />
                  Expected {selectedProduct.repayment_frequency} payment: <strong>{fmtK(estimate.perPeriod)}</strong> × {estimate.periods}.
                </div>
              )}
              <Field label="Loan purpose * (20–300 characters)" error={errors.loan_purpose}>
                <textarea value={get('loan_purpose')} onChange={(e) => set('loan_purpose', e.target.value)} rows={3} className={inputCls} />
              </Field>
              <Field label="Repayment source *" error={errors.repayment_source}>
                <input value={get('repayment_source')} onChange={(e) => set('repayment_source', e.target.value)} className={inputCls} placeholder="e.g. Monthly salary" />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <p className="text-sm text-slate-300">Optional supporting documents. You may skip this step.</p>
              <Field label="Business registration, tax returns, insurance (up to 5 files)" error={errors.extra}>
                <MultiUpload
                  files={uploads.extra}
                  disabled={uploading || uploads.extra.length >= 5}
                  accept="*"
                  onPick={async (f) => {
                    const up = await uploadOne(f, 'extra_doc', 10);
                    if (up) setUploads((u) => ({ ...u, extra: [...u.extra, up] }));
                  }}
                  onRemove={(p) => removeUpload('extra', p)}
                />
              </Field>
              <button
                onClick={next}
                className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-slate-200"
              >
                Skip this step
              </button>
            </>
          )}

          {step === 7 && (
            <>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={values.consent_credit_check === true}
                  onChange={(e) => set('consent_credit_check', e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#f5b300]"
                />
                I consent to credit and background checks. *
              </label>
              {errors.consent_credit_check && <p className={errCls}>{errors.consent_credit_check}</p>}
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={values.consent_accuracy === true}
                  onChange={(e) => set('consent_accuracy', e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#f5b300]"
                />
                I declare all information provided is accurate. *
              </label>
              {errors.consent_accuracy && <p className={errCls}>{errors.consent_accuracy}</p>}
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={values.consent_terms === true}
                  onChange={(e) => set('consent_terms', e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#f5b300]"
                />
                <span>
                  I agree to the <Link href="/terms" target="_blank" className="text-[#f5b300] underline">Terms and Conditions</Link>. *
                </span>
              </label>
              {errors.consent_terms && <p className={errCls}>{errors.consent_terms}</p>}
              {submitError && <p className="text-sm text-red-400">{submitError}</p>}
            </>
          )}

          {errors._upload && <p className="text-sm text-red-400">{errors._upload}</p>}

          <div className="flex gap-3 pt-1">
            {step > 1 && (
              <button
                onClick={back}
                className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-white/20 px-5 text-sm font-medium text-slate-200"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {step < 6 && (
              <button
                onClick={next}
                className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-[#f5b300] px-5 text-sm font-bold text-[#0A1834]"
              >
                Next <ArrowRight size={16} />
              </button>
            )}
            {step === 6 && (
              <button
                onClick={next}
                className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-[#f5b300] px-5 text-sm font-bold text-[#0A1834]"
              >
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 7 && (
              <button
                onClick={submit}
                disabled={submitting || uploading}
                className="min-h-12 flex-1 rounded-xl bg-[#f5b300] px-5 text-sm font-bold text-[#0A1834] disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadedRow({ file, onRemove }: { file: StoredUpload; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-200">
      <FileUp size={16} className="shrink-0 text-[#f5b300]" />
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      <button onClick={onRemove} aria-label={`Remove ${file.name}`} className="shrink-0 p-1 text-slate-400 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}

function MultiUpload({ files, disabled, accept, capture, onPick, onRemove }: {
  files: StoredUpload[];
  disabled?: boolean;
  accept: string;
  capture?: boolean;
  onPick: (f: File) => void;
  onRemove: (path: string) => void;
}) {
  return (
    <div className="space-y-2">
      {files.map((f) => (
        <UploadedRow key={f.path} file={f} onRemove={() => onRemove(f.path)} />
      ))}
      <label className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-slate-300 ${disabled ? 'opacity-40' : ''}`}>
        <Camera size={18} />
        Add file{files.length > 0 ? ' (another)' : ''}
        <input
          type="file"
          accept={accept}
          capture={capture ? 'environment' : undefined}
          multiple
          disabled={disabled}
          className="hidden"
          onChange={async (e) => {
            const list = Array.from(e.target.files ?? []);
            e.target.value = '';
            for (const f of list) {
              if (disabled) break;
              await onPick(f);
            }
          }}
        />
      </label>
    </div>
  );
}
