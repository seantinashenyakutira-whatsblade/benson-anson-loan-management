-- Leads permission codes (needed by RLS policies)
INSERT INTO permissions (code, name, description) VALUES
  ('leads_view', 'View Leads', 'View lead records'),
  ('leads_manage', 'Manage Leads', 'Update and assign leads')
ON CONFLICT (code) DO NOTHING;

-- Seed leads permissions into existing roles
INSERT INTO role_permissions (role, permission_id)
SELECT 'branch_manager', p.id FROM permissions p
WHERE p.code IN ('leads_view', 'leads_manage')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'loan_officer', p.id FROM permissions p
WHERE p.code IN ('leads_view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Leads table for public application form (Phase 10.6)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  amount_requested numeric(12,2),
  collateral_type text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','converted','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.leads is 'Public lead captures from /apply and internal manual entries.';

alter table public.leads enable row level security;

-- Anyone can insert (public form)
create policy "leads_insert_public" on public.leads
  for insert with check (true);

-- Staff with leads_view can see all
create policy "leads_select_staff" on public.leads
  for select using (
    public.user_has_permission(auth.uid(), 'leads_view')
    or public.user_has_permission(auth.uid(), 'leads_manage')
  );

-- Staff with leads_manage can update
create policy "leads_manage_staff" on public.leads
  for update using (
    public.user_has_permission(auth.uid(), 'leads_manage')
  );

-- Indexes
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_assigned_to_idx on public.leads (assigned_to);

-- Auto-update updated_at
create or replace function public.leads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.leads_set_updated_at();
