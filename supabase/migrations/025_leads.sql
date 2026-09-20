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

-- Owner / branch_manager see all; loan_officer sees own assigned
create policy "leads_select_staff" on public.leads
  for select using (
    public.user_role() = 'owner'
    or public.user_role() = 'branch_manager'
    or assigned_to = auth.uid()
  );

-- Owner / branch_manager can update
create policy "leads_manage_staff" on public.leads
  for update using (
    public.user_role() = 'owner'
    or public.user_role() = 'branch_manager'
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
