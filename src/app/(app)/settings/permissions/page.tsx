'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { ROLE_PERMISSIONS, clearOverrideCache, type Role } from '@/lib/permissions';
import { ArrowLeft } from 'lucide-react';

const EDITABLE_ROLES: Role[] = ['branch_manager', 'loan_officer', 'cashier'];

function moduleOf(code: string): string {
  return code.split('.')[0] || 'other';
}

export default function PermissionsMatrixPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [allCodes, setAllCodes] = useState<string[]>([]);
  const [granted, setGranted] = useState<Record<Role, string[]>>({ owner: ['*'], branch_manager: [], loan_officer: [], cashier: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOwner = profile?.role === 'owner';

  useEffect(() => {
    const load = async () => {
      const [{ data: perms }, ...roleResults] = await Promise.all([
        supabase.from('permissions').select('code').order('code'),
        ...EDITABLE_ROLES.map((r) => supabase.rpc('rpc_get_role_permissions', { p_role: r })),
      ]);
      if (perms) setAllCodes((perms as Array<{ code: string }>).map((p) => p.code).filter((c) => c !== '*'));
      const next = { owner: ['*'], branch_manager: [], loan_officer: [], cashier: [] } as Record<Role, string[]>;
      roleResults.forEach((res, i) => {
        const role = EDITABLE_ROLES[i]!;
        next[role] = ((res.data as string[]) || []).slice().sort();
      });
      setGranted(next);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (profile && !isOwner) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="glass-card p-8 text-center">
          <h1 className="text-xl font-bold text-text-primary">Owner Only</h1>
          <p className="mt-1 text-sm text-text-secondary">Only owners can manage role permissions.</p>
          <Link href="/settings" className="mt-4 inline-block text-sm text-accent-primary hover:underline">
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  const toggle = (role: Role, code: string) => {
    setGranted((prev) => {
      const has = prev[role].includes(code);
      return { ...prev, [role]: has ? prev[role].filter((c) => c !== code) : [...prev[role], code].sort() };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const role of EDITABLE_ROLES) {
        const { data: current } = await supabase.rpc('rpc_get_role_permissions', { p_role: role });
        const cur = new Set<string>((current as string[]) || []);
        const want = new Set(granted[role]);
        const toAdd = [...want].filter((c) => !cur.has(c));
        const toRemove = [...cur].filter((c) => !want.has(c));
        if (toAdd.length > 0) {
          const { data: rows } = await supabase.from('permissions').select('id, code').in('code', toAdd);
          const inserts = ((rows || []) as Array<{ id: string; code: string }>).map((r) => ({ role, permission_id: r.id }));
          if (inserts.length > 0) {
            const { error } = await supabase.from('role_permissions').insert(inserts);
            if (error) throw new Error(error.message);
          }
        }
        if (toRemove.length > 0) {
          const { data: rows } = await supabase.from('permissions').select('id, code').in('code', toRemove);
          const ids = ((rows || []) as Array<{ id: string }>).map((r) => r.id);
          if (ids.length > 0) {
            const { error } = await supabase.from('role_permissions').delete().eq('role', role).in('permission_id', ids);
            if (error) throw new Error(error.message);
          }
        }
      }
      // Mark touched permission rows as overridden
      const touched = [...new Set([...EDITABLE_ROLES.flatMap((r) => granted[r])])];
      if (touched.length > 0) {
        await supabase.from('permissions').update({ overridden: true }).in('code', touched);
      }
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'permissions.updated',
        entity_type: 'role_permissions',
        entity_id: user.id,
        after_data: granted,
      });
      clearOverrideCache();
      alert('Permissions saved. They take effect on next navigation.');
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'save failed'));
    }
    setSaving(false);
  };

  const resetRole = (role: Role) => {
    setGranted((prev) => ({ ...prev, [role]: [...ROLE_PERMISSIONS[role]].sort() }));
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;

  const modules = [...new Set(allCodes.map(moduleOf))].sort();

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Permission Matrix</h1>
          <p className="text-sm text-text-secondary">Owner column is locked — you cannot lock yourself out.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[var(--radius-button)] bg-accent-primary px-6 py-2.5 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="glass-card overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="pb-2 pr-4 font-medium">Permission</th>
              <th className="pb-2 pr-4 text-center font-medium">Owner 🔒</th>
              {EDITABLE_ROLES.map((r) => (
                <th key={r} className="pb-2 text-center font-medium capitalize">
                  {r.replace('_', ' ')}
                  <button onClick={() => resetRole(r)} className="ml-2 text-[10px] font-normal text-accent-primary hover:underline" title="Restore defaults">
                    reset
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {modules.map((mod) => (
            <tbody key={mod}>
              <tr>
                <td colSpan={5} className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {mod}
                </td>
              </tr>
              {allCodes.filter((c) => moduleOf(c) === mod).map((code) => (
                <tr key={code} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-4 font-mono text-xs text-text-primary">{code}</td>
                  <td className="py-2 text-center text-success">✓</td>
                  {EDITABLE_ROLES.map((r) => (
                    <td key={r} className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={granted[r].includes(code)}
                        onChange={() => toggle(r, code)}
                        className="h-4 w-4 accent-accent-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
