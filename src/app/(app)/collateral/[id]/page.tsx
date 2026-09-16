'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

interface CollateralDetail {
  id: string;
  collateral_type: string;
  description: string;
  make_model: string | null;
  year: number | null;
  registration_number: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  color: string | null;
  condition: string;
  estimated_value: number;
  market_value: number | null;
  address: string | null;
  city: string | null;
  province: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  customers?: { id: string; first_name: string; last_name: string; phone: string };
  collateral_media?: Array<{ id: string; media_type: string; file_url: string; caption: string | null }>;
  collateral_valuations?: Array<{ id: string; valuation_date: string; valuation_amount: number; valuer_name: string | null }>;
}

export default function CollateralDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<CollateralDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchItem = async () => {
      const { data } = await supabase
        .from('collateral')
        .select('*, customers(id, first_name, last_name, phone), collateral_media(*), collateral_valuations(*)')
        .eq('id', params.id)
        .single();

      if (data) setItem(data);
      setLoading(false);
    };

    fetchItem();
  }, [params.id, supabase]);

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!item) return <div className="py-12 text-center text-text-muted">Collateral not found.</div>;

  const statusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success/10 text-success';
      case 'pledged': return 'bg-info/10 text-info';
      case 'repossessed': return 'bg-warning/10 text-warning';
      default: return 'bg-text-muted/10 text-text-muted';
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{item.description}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-text-muted capitalize">{item.collateral_type.replace('_', ' ')}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColor(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>
          <Link
            href={`/collateral/${item.id}/edit`}
            className="rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass"
          >
            Edit
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-text-muted">Estimated Value</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(item.estimated_value)}</p>
          </div>
          {item.market_value && (
            <div>
              <p className="text-xs text-text-muted">Market Value</p>
              <p className="text-lg font-semibold text-text-primary">{formatKwacha(item.market_value)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.make_model && (
            <div>
              <p className="text-xs text-text-muted">Make/Model</p>
              <p className="text-sm text-text-primary">{item.make_model}</p>
            </div>
          )}
          {item.year && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-text-muted" />
              <p className="text-sm text-text-primary">{item.year}</p>
            </div>
          )}
          {item.color && (
            <div>
              <p className="text-xs text-text-muted">Color</p>
              <p className="text-sm text-text-primary">{item.color}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted">Condition</p>
            <p className="text-sm text-text-primary capitalize">{item.condition}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.registration_number && (
            <div>
              <p className="text-xs text-text-muted">Registration No.</p>
              <p className="text-sm text-text-primary">{item.registration_number}</p>
            </div>
          )}
          {item.chassis_number && (
            <div>
              <p className="text-xs text-text-muted">Chassis No.</p>
              <p className="text-sm text-text-primary">{item.chassis_number}</p>
            </div>
          )}
          {item.engine_number && (
            <div>
              <p className="text-xs text-text-muted">Engine No.</p>
              <p className="text-sm text-text-primary">{item.engine_number}</p>
            </div>
          )}
        </div>

        {(item.address || item.city) && (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin size={14} />
              {[item.address, item.city, item.province].filter(Boolean).join(', ')}
            </div>
          </div>
        )}

        {item.customers && (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-xs text-text-muted">Owner</p>
            <Link href={`/customers/${item.customers.id}`} className="text-sm text-accent-primary hover:underline">
              {item.customers.first_name} {item.customers.last_name}
            </Link>
            <p className="text-xs text-text-secondary">{item.customers.phone}</p>
          </div>
        )}

        {item.notes && (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-xs text-text-muted">Notes</p>
            <p className="text-sm text-text-secondary">{item.notes}</p>
          </div>
        )}
      </div>

      {/* Valuations */}
      {item.collateral_valuations && item.collateral_valuations.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Valuations</h2>
          <div className="space-y-2">
            {item.collateral_valuations.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                <div>
                  <p className="text-sm text-text-primary">{formatKwacha(v.valuation_amount)}</p>
                  <p className="text-xs text-text-muted">{v.valuation_date}</p>
                </div>
                {v.valuer_name && (
                  <p className="text-xs text-text-secondary">{v.valuer_name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media */}
      {item.collateral_media && item.collateral_media.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Photos & Documents</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item.collateral_media.map((m) => (
              <div key={m.id} className="rounded-xl border border-border-subtle p-2">
                <div className="flex h-32 items-center justify-center bg-surface-glass rounded-lg">
                  <span className="text-xs text-text-muted">{m.media_type}</span>
                </div>
                {m.caption && <p className="mt-1 text-xs text-text-secondary truncate">{m.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
