import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { REPORT_REGISTRY } from '@/lib/reports/registry';
import { STATIC_PAGES } from '@/lib/search/pages';

const PER_CATEGORY = 5;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const term = q.toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const out: Record<string, unknown[]> = {};

  const pages = STATIC_PAGES.filter((p) => p.name.toLowerCase().includes(term))
    .slice(0, 6)
    .map((p) => ({ name: p.name, href: p.href }));
  if (pages.length > 0) out.pages = pages;

  const reports = Object.values(REPORT_REGISTRY)
    .filter((r) => r.slug.includes(term) || r.title.toLowerCase().includes(term))
    .slice(0, 6)
    .map((r) => ({ name: r.title, sub: r.subtitle, href: `/reports/${r.slug}` }));
  if (reports.length > 0) out.reports = reports;

  // Empty query: static pages only (no DB scans).
  if (term.length === 0) return NextResponse.json(pages.length > 0 ? { pages } : {});

  // Short queries: pages + reports only (avoids full-table ILIKE scans).
  if (term.length < 2) return NextResponse.json(out);

  const [custRes, loanRes, payRes, invRes, prodRes] = await Promise.all([
    supabase
      .from('customers')
      .select('id, first_name, last_name, phone, nrc_number')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,nrc_number.ilike.%${term}%`)
      .limit(PER_CATEGORY),
    supabase.from('loans').select('id, loan_number, customer_id, principal_amount').ilike('loan_number', `%${term}%`).limit(PER_CATEGORY),
    supabase.from('payments').select('id, payment_number, amount, loan_id').ilike('payment_number', `%${term}%`).limit(PER_CATEGORY),
    supabase
      .from('customer_invitations')
      .select('id, token, customer_name, status')
      .or(`token.ilike.%${term}%,customer_name.ilike.%${term}%`)
      .limit(PER_CATEGORY),
    supabase.from('loan_products').select('id, name, code').or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(PER_CATEGORY),
  ]);

  type Customer = { id: string; first_name: string; last_name: string; phone: string };
  const customers = ((custRes.data || []) as Customer[]).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    phone: c.phone,
    href: `/customers/${c.id}`,
  }));
  if (customers.length > 0) out.customers = customers;

  type Loan = { id: string; loan_number: string; customer_id: string; principal_amount: number };
  const loansByNumber = ((loanRes.data || []) as Loan[]);

  // Also pull loans belonging to name-matched customers.
  let loansByCustomer: Loan[] = [];
  const customerIds = customers.map((c) => c.id);
  if (customerIds.length > 0) {
    const { data } = await supabase
      .from('loans')
      .select('id, loan_number, customer_id, principal_amount')
      .in('customer_id', customerIds)
      .limit(PER_CATEGORY);
    loansByCustomer = (data || []) as Loan[];
  }
  const loanMap = new Map<string, Loan>();
  for (const l of [...loansByNumber, ...loansByCustomer]) loanMap.set(l.id, l);

  let customerNames: Record<string, string> = {};
  if (loanMap.size > 0) {
    const { data } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .in('id', [...loanMap.values()].map((l) => l.customer_id));
    customerNames = Object.fromEntries(
      ((data || []) as Array<{ id: string; first_name: string; last_name: string }>).map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
    );
  }
  const loans = [...loanMap.values()].slice(0, PER_CATEGORY).map((l) => ({
    id: l.id,
    loan_no: l.loan_number,
    customer: customerNames[l.customer_id] ?? '',
    amount: l.principal_amount,
    href: `/loans/${l.id}`,
  }));
  if (loans.length > 0) out.loans = loans;

  type Payment = { id: string; payment_number: string; amount: number; loan_id: string };
  const payments = ((payRes.data || []) as Payment[]).map((p) => ({
    id: p.id,
    receipt_no: p.payment_number,
    amount: p.amount,
    href: `/payments?receipt=${encodeURIComponent(p.payment_number)}`,
  }));
  if (payments.length > 0) out.payments = payments;

  type Invitation = { id: string; token: string; customer_name: string | null; status: string };
  const invitations = ((invRes.data || []) as Invitation[]).map((v) => ({
    id: v.id,
    token: v.token.length > 16 ? `${v.token.slice(0, 12)}…` : v.token,
    customer: v.customer_name ?? '',
    status: v.status,
    href: `/invitations/${v.id}`,
  }));
  if (invitations.length > 0) out.invitations = invitations;

  type Product = { id: string; name: string; code: string };
  const products = ((prodRes.data || []) as Product[]).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    href: '/settings/loan-products',
  }));
  if (products.length > 0) out.products = products;

  return NextResponse.json(out);
}
