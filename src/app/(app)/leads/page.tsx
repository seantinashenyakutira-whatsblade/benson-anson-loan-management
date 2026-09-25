'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { canAny } from '@/lib/permissions';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, UserPlus } from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  amount_requested: number | null;
  collateral_type: string | null;
  notes: string | null;
  status: string;
  assigned_to: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = {
  new: 'info',
  contacted: 'warning',
  converted: 'success',
  closed: 'neutral',
};

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const isAdmin = profile && canAny(profile.role, ['leads.*', 'leads_manage']);

  useEffect(() => {
    const supabase = createClient();
    let q = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    if (!isAdmin && profile) q = q.eq('assigned_to', profile.id);
    q.then(({ data }) => {
      setLeads((data || []) as unknown as Lead[]);
      setLoading(false);
    });
  }, [filter, isAdmin, profile]);

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from('leads').update({ status }).eq('id', id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  if (profile && !canAny(profile.role, ['leads.*', 'leads.view_own', 'leads_manage'])) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">You do not have access to leads.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-accent-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);
  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-sm text-text-secondary">{counts.all} total · {counts.new} new</p>
        </div>
        <Link href="/apply" className="rounded-lg bg-accent-primary px-3 py-2 text-sm font-semibold text-white hover:brightness-110">
          <UserPlus size={16} className="mr-1 inline" /> New Lead
        </Link>
      </div>

      <Surface className="p-1">
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'new', 'contacted', 'converted', 'closed'] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(s)}
              className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold capitalize"
            >
              {s} ({counts[s]})
            </Button>
          ))}
        </div>
      </Surface>

      <Surface className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-text-secondary">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-text-muted">No leads found.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{lead.full_name}</span>
                    <Badge variant={STATUS_VARIANTS[lead.status] ?? 'neutral'} className="uppercase">
                      {lead.status}
                    </Badge>
                    {lead.source && <span className="text-[10px] text-text-muted">via {lead.source}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Phone size={12} />{lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail size={12} />{lead.email}</span>}
                    {lead.amount_requested && <span>K {Number(lead.amount_requested).toLocaleString('en-ZM')}</span>}
                    {lead.collateral_type && <span className="rounded-full bg-surface-glass px-2 py-0.5">{lead.collateral_type}</span>}
                  </div>
                  {lead.notes && <p className="mt-1 text-xs text-text-muted line-clamp-1">{lead.notes}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    {(['new', 'contacted', 'converted', 'closed'] as const).map((s) => (
                      <Button
                        key={s}
                        variant={lead.status === s ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => updateStatus(lead.id, s)}
                        disabled={lead.status === s}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
