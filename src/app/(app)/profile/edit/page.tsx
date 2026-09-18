'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ArrowLeft } from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [form, setForm] = useState({ full_name: '', phone: '', bio: '', avatar_url: '' });
  const [branchName, setBranchName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, phone, bio, avatar_url, role, branches(name)')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const b = data.branches as unknown as { name: string } | Array<{ name: string }> | null;
          setForm({
            full_name: data.full_name || '',
            phone: data.phone || '',
            bio: (data as { bio?: string }).bio || '',
            avatar_url: (data as { avatar_url?: string }).avatar_url || '',
          });
          setRole(data.role || '');
          setBranchName(Array.isArray(b) ? b[0]?.name || '' : b?.name || '');
        }
        setLoading(false);
      });
  }, [supabase, user]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Only JPEG or PNG images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB.');
      return;
    }
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error: upError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
    if (upError) {
      setUploading(false);
      alert('Upload failed: ' + upError.message);
      return;
    }
    const { data: url } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: saveError } = await supabase.from('profiles').update({ avatar_url: url.publicUrl }).eq('id', user.id);
    setUploading(false);
    if (saveError) {
      alert('Could not save avatar: ' + saveError.message);
      return;
    }
    setForm((f) => ({ ...f, avatar_url: url.publicUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!/^\+?[0-9\s-]{9,16}$/.test(form.phone.trim())) {
      alert('Enter a valid mobile number (9–16 digits, optional leading +).');
      return;
    }
    if (form.bio.length > 200) {
      alert('Bio must be 200 characters or less.');
      return;
    }
    setSaving(true);
    // NOTE: role and branch are intentionally never sent — owners set those.
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim(), bio: form.bio.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    router.push('/profile');
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card space-y-4 p-6">
        <h1 className="text-2xl font-bold text-text-primary">Edit Profile</h1>

        <div className="flex items-center gap-4">
          <UserAvatar user={{ full_name: form.full_name, avatar_url: form.avatar_url, role }} size="lg" showRoleBadge />
          <label className="cursor-pointer rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass">
            {uploading ? 'Uploading...' : 'Change Photo'}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} disabled={uploading} />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Full Name *</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Mobile Number *</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+260 977 000000" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Bio (optional, 200 chars)</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} maxLength={200} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Branch (read-only)</label>
              <input value={branchName} disabled className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-muted focus:outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Role (read-only)</label>
              <input value={role.replace('_', ' ')} disabled className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm capitalize text-text-muted focus:outline-none disabled:opacity-60" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
