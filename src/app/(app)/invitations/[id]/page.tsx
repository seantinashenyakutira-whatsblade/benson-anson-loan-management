'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Download, FileText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { shortToken, statusLabel } from '@/lib/invitations/share';
import { ShareBox } from '../share-box';
import { approveSubmission, cancelInvitation, createInvitation, rejectSubmission } from '../actions';
import type { InvitationRow } from '../page';

interface Submission {
  id: string;
  invitation_id: string;
  full_name: string;
  date_of_birth: string;
  nrc_or_passport: string;
  national_id_type: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  address: string;
  residence_type: string | null;
  marital_status: string | null;
  nationality: string | null;
  occupation: string;
  employer_name: string | null;
  employer_address: string | null;
  job_title: string | null;
  employment_duration_months: number | null;
  monthly_income: number;
  other_income: string | null;
  existing_loans: string | null;
  assets_description: string | null;
  collateral_type: string;
  collateral_description: string;
  collateral_estimated_value: number;
  collateral_ownership: string;
  collateral_location: string | null;
  collateral_serial: string | null;
  loan_amount_requested: number;
  loan_purpose: string;
  preferred_tenure: string;
  repayment_source: string;
  consent_credit_check: boolean;
  consent_accuracy: boolean;
  consent_terms: boolean;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string | null;
  submitted_at: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_note: string | null;
  rejection_reason: string | null;
}

interface Doc {
  id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  signedUrl?: string;
}

const TABS = ['Personal', 'Employment', 'Financial', 'Collateral', 'Loan Request', 'Documents', 'Consent'] as const;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === '') return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-text-muted">{k}</dt>
      <dd className="text-right text-text-primary">{v}</dd>
    </div>
  );
}

export default function InvitationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inv, setInv] = useState<InvitationRow | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [sub, setSub] = useState<Submission | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [verifierName, setVerifierName] = useState('');
  const [customerLink, setCustomerLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Personal');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showShare, setShowShare] = useState<{ token: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const role = profile?.role;
  const allowed = role === 'owner' || role === 'branch_manager' || role === 'loan_officer';
  const canApprove = role === 'owner' || role === 'branch_manager';

  useEffect(() => {
    (async () => {
      const { data: invitation } = await supabase.from('customer_invitations').select('*').eq('id', id).maybeSingle();
      if (!invitation) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setInv(invitation as InvitationRow);
      const [{ data: off }, { data: br }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', (invitation as InvitationRow).officer_id).maybeSingle(),
        supabase.from('branches').select('name').eq('id', (invitation as InvitationRow).branch_id).maybeSingle(),
      ]);
      if (off) setOfficerName((off as { full_name: string }).full_name);
      if (br) setBranchName((br as { name: string }).name);

      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('invitation_id', id)
        .maybeSingle();
      if (submission) {
        const s = submission as Submission;
        setSub(s);
        if (s.verification_note) setNote(s.verification_note);
        const { data: documents } = await supabase.from('onboarding_documents').select('*').eq('submission_id', s.id);
        const list = (documents ?? []) as Doc[];
        const withUrls = await Promise.all(
          list.map(async (d) => {
            const { data: signed } = await supabase.storage.from('onboarding_uploads').createSignedUrl(d.file_path, 3600);
            return { ...d, signedUrl: signed?.signedUrl };
          }),
        );
        setDocs(withUrls);
        if (s.verified_by) {
          const { data: verifier } = await supabase.from('profiles').select('full_name').eq('id', s.verified_by).maybeSingle();
          if (verifier) setVerifierName((verifier as { full_name: string }).full_name);
        }
        const { data: audit } = await supabase
          .from('audit_logs')
          .select('after_data')
          .eq('entity_type', 'onboarding_submission')
          .eq('entity_id', s.id)
          .eq('action', 'onboarding.approved')
          .maybeSingle();
        const cid = (audit?.after_data as { customer_id?: string } | null)?.customer_id;
        if (cid) setCustomerLink(`/customers/${cid}`);
      }
      setLoading(false);
    })();
  }, [supabase, id]);

  if (authLoading || loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (profile && !allowed) {
    return <AccessDenied role={role} />;
  }

  if (notFound || !inv) {
    return <div className="py-12 text-center text-text-muted">Invitation not found.</div>;
  }

  async function onApprove() {
    setError(null);
    setBusy(true);
    const res = await approveSubmission(sub!.id, note);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Approval failed.');
      return;
    }
    router.push(res.customerId ? `/customers/${res.customerId}` : '/invitations');
    router.refresh();
  }

  async function onReject() {
    setError(null);
    if (!reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setBusy(true);
    const res = await rejectSubmission(sub!.id, reason);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Rejection failed.');
      return;
    }
    router.push('/invitations');
    router.refresh();
  }

  async function onCancel() {
    setError(null);
    if (!inv) return;
    if (!window.confirm('Cancel this invitation? The link will stop working.')) return;
    setBusy(true);
    const res = await cancelInvitation(inv.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Cancel failed.');
      return;
    }
    router.push('/invitations');
    router.refresh();
  }

  async function onRegenerate() {
    setError(null);
    if (!inv) return;
    setBusy(true);
    const res = await createInvitation({ customerName: inv.customer_name ?? '', customerPhone: inv.customer_phone ?? '', expiryHours: 24 });
    setBusy(false);
    if (!res.ok || !res.invitation) {
      setError(res.error ?? 'Regenerate failed.');
      return;
    }
    setShowShare({ token: res.invitation.token, url: res.invitation.url });
  }

  const photos = docs.filter((d) => d.signedUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(d.file_path));
  const files = docs.filter((d) => !/\.(jpg|jpeg|png|webp|gif)$/i.test(d.file_path));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/invitations" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back to invitations
      </Link>

      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{inv.customer_name || 'Unnamed application'}</h1>
            <p className="font-mono text-xs text-text-muted">{shortToken(inv.token)}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {officerName} · {branchName} · Expires {inv.expires_at.slice(0, 16).replace('T', ' ')}
            </p>
          </div>
          <span className="rounded-full bg-surface-glass px-3 py-1 text-xs text-text-secondary">{statusLabel(inv.status)}</span>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {inv.status === 'pending' && (
        <div className="glass-card space-y-3 p-4">
          <p className="text-sm text-text-secondary">Waiting for the customer to fill the form. Share the link again or cancel it.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowShare({ token: inv.token, url: `/onboard/${inv.token}` })} className="rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-sm font-medium text-accent-on-primary">
              Resend Link
            </button>
            <button onClick={onCancel} disabled={busy} className="rounded-[var(--radius-button)] border border-border-subtle px-4 py-2.5 text-sm text-text-secondary disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {sub && (inv.status === 'submitted' || inv.status === 'approved' || inv.status === 'rejected') && (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-button)] bg-surface-glass p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-[var(--radius-button)] px-3 py-2 text-xs font-medium ${tab === t ? 'bg-surface-glass-2 text-text-primary shadow-sm' : 'text-text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="glass-card p-4">
            {tab === 'Personal' && (
              <dl>
                <Row k="Full name" v={sub.full_name} />
                <Row k="Date of birth" v={sub.date_of_birth} />
                <Row k="ID type" v={sub.national_id_type} />
                <Row k="ID number" v={sub.nrc_or_passport} />
                <Row k="Phone" v={sub.phone} />
                <Row k="Alt phone" v={sub.alt_phone} />
                <Row k="Email" v={sub.email} />
                <Row k="Address" v={sub.address} />
                <Row k="Residence" v={sub.residence_type} />
                <Row k="Marital status" v={sub.marital_status} />
                <Row k="Nationality" v={sub.nationality} />
                <Row k="Next of kin" v={`${sub.next_of_kin_name} (${sub.next_of_kin_phone})${sub.next_of_kin_relationship ? ` — ${sub.next_of_kin_relationship}` : ''}`} />
              </dl>
            )}
            {tab === 'Employment' && (
              <dl>
                <Row k="Occupation" v={sub.occupation} />
                <Row k="Employer" v={sub.employer_name} />
                <Row k="Employer address" v={sub.employer_address} />
                <Row k="Job title" v={sub.job_title} />
                <Row k="Duration" v={sub.employment_duration_months != null ? `${sub.employment_duration_months} months` : null} />
                <Row k="Monthly income" v={`K ${Number(sub.monthly_income).toLocaleString()}`} />
                <Row k="Other income" v={sub.other_income} />
              </dl>
            )}
            {tab === 'Financial' && (
              <dl>
                <Row k="Existing loans" v={sub.existing_loans} />
                <Row k="Assets" v={sub.assets_description} />
              </dl>
            )}
            {tab === 'Collateral' && (
              <dl>
                <Row k="Type" v={sub.collateral_type} />
                <Row k="Description" v={sub.collateral_description} />
                <Row k="Est. value" v={`K ${Number(sub.collateral_estimated_value).toLocaleString()}`} />
                <Row k="Ownership" v={sub.collateral_ownership} />
                <Row k="Location" v={sub.collateral_location} />
                <Row k="Serial" v={sub.collateral_serial} />
              </dl>
            )}
            {tab === 'Loan Request' && (
              <dl>
                <Row k="Amount" v={`K ${Number(sub.loan_amount_requested).toLocaleString()}`} />
                <Row k="Purpose" v={sub.loan_purpose} />
                <Row k="Tenure" v={sub.preferred_tenure} />
                <Row k="Repayment source" v={sub.repayment_source} />
              </dl>
            )}
            {tab === 'Documents' && (
              <div className="space-y-4">
                {photos.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-text-muted">Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((d) => (
                        <button key={d.id} onClick={() => setLightbox(d.signedUrl!)} className="overflow-hidden rounded-xl border border-border-subtle">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.signedUrl} alt={d.file_name ?? d.doc_type} className="h-24 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-text-muted">Files</p>
                    <div className="space-y-2">
                      {files.map((d) => (
                        <a key={d.id} href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border-subtle/50 p-3 text-sm text-text-primary hover:bg-surface-glass">
                          <FileText size={16} className="shrink-0 text-accent-primary" />
                          <span className="min-w-0 flex-1 truncate">{d.file_name ?? d.file_path}</span>
                          <Download size={14} className="shrink-0 text-text-muted" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {docs.length === 0 && <p className="text-sm text-text-muted">No documents uploaded.</p>}
              </div>
            )}
            {tab === 'Consent' && (
              <dl>
                <Row k="Credit checks" v={sub.consent_credit_check ? 'Yes' : 'No'} />
                <Row k="Accuracy declared" v={sub.consent_accuracy ? 'Yes' : 'No'} />
                <Row k="Terms agreed" v={sub.consent_terms ? 'Yes' : 'No'} />
                <Row k="Submitted" v={sub.submitted_at.slice(0, 16).replace('T', ' ')} />
              </dl>
            )}
          </div>

          {inv.status === 'submitted' && canApprove && (
            <div className="glass-card space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Officer notes (stored with verification)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:outline-none" placeholder="Verification findings…" />
              </div>
              {!showReject ? (
                <div className="flex gap-2">
                  <button onClick={onApprove} disabled={busy} className="flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-sm font-medium text-accent-on-primary disabled:opacity-50">
                    <Check size={16} /> {busy ? 'Working…' : 'Approve'}
                  </button>
                  <button onClick={() => setShowReject(true)} className="flex-1 rounded-[var(--radius-button)] border border-danger/40 px-4 py-2.5 text-sm text-danger">
                    Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Rejection reason *</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReject(false)} className="flex-1 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2.5 text-sm text-text-secondary">Back</button>
                    <button onClick={onReject} disabled={busy} className="flex-1 rounded-[var(--radius-button)] bg-danger px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                      {busy ? 'Working…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {inv.status === 'approved' && (
            <div className="glass-card p-4 text-sm">
              <p className="text-text-secondary">
                Approved{sub.verified_at ? ` on ${sub.verified_at.slice(0, 16).replace('T', ' ')}` : ''}{verifierName ? ` by ${verifierName}` : ''}.
              </p>
              {customerLink && (
                <Link href={customerLink} className="mt-2 inline-block text-accent-primary hover:underline">
                  Open customer record →
                </Link>
              )}
              {sub.verification_note && <p className="mt-2 text-text-secondary">Note: {sub.verification_note}</p>}
            </div>
          )}

          {inv.status === 'rejected' && (
            <div className="glass-card space-y-3 p-4 text-sm">
              <p className="text-text-secondary">Rejected{sub.verified_at ? ` on ${sub.verified_at.slice(0, 16).replace('T', ' ')}` : ''}{verifierName ? ` by ${verifierName}` : ''}.</p>
              {sub.rejection_reason && <p className="text-text-primary">Reason: {sub.rejection_reason}</p>}
              <button onClick={onRegenerate} disabled={busy} className="rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 font-medium text-accent-on-primary disabled:opacity-50">
                Regenerate invitation
              </button>
            </div>
          )}
        </>
      )}

      {inv.status === 'expired' && !sub && (
        <div className="glass-card space-y-3 p-4 text-sm">
          <p className="text-text-secondary">This invitation expired before it was used.</p>
          <button onClick={onRegenerate} disabled={busy} className="rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 font-medium text-accent-on-primary disabled:opacity-50">
            Regenerate invitation
          </button>
        </div>
      )}

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowShare(null)}>
          <div className="glass-card max-h-[85vh] w-full max-w-md overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary">Share Invitation</h2>
            <div className="mt-3">
              <ShareBox token={showShare.token} path={showShare.url} customerName={inv.customer_name} />
            </div>
            <button onClick={() => { setShowShare(null); router.push('/invitations'); router.refresh(); }} className="mt-4 w-full py-2 text-center text-sm text-text-muted hover:text-text-primary">
              Done
            </button>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Document photo" className="max-h-full max-w-full rounded-xl object-contain" />
          <button onClick={() => setLightbox(null)} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
