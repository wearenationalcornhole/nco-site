'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'organizer'|'player';

export default function ProfileClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [role, setRole] = useState<Role>('player');
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    organization: '', city: '', region: '', country: 'US'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/portal/login'); return; }
        setEmail(user.email ?? null);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, is_profile_complete, first_name, last_name, phone, organization, city, region, country')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        // If already complete, bounce to correct area
        if (profile?.is_profile_complete) {
          router.replace(profile.role === 'organizer' ? '/portal/events' : '/portal/players');
          return;
        }

        if (profile?.role) setRole(profile.role as Role);
        setForm({
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
          organization: profile?.organization ?? '',
          city: profile?.city ?? '',
          region: profile?.region ?? '',
          country: profile?.country ?? 'US',
        });

        setLoading(false);
      } catch (e: any) {
        console.error('profile init error', e);
        setErr(e?.message || 'Failed to load profile');
        setLoading(false);
      }
    };
    run();
  }, [router, supabase]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/portal/login'); return; }

      // Validate requireds per role (client-side)
      if (!form.first_name || !form.last_name || !form.city || !form.region) {
        throw new Error('Please fill first name, last name, city, and state/region.');
      }
      if (role === 'organizer' && !form.organization) {
        throw new Error('Please add your organization.');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
          organization: role === 'organizer' ? form.organization : null,
          city: form.city,
          region: form.region,
          country: form.country || 'US',
        })
        .eq('id', user.id);

      if (error) throw error;

      // DB trigger will set is_profile_complete. Route by role.
      router.replace(role === 'organizer' ? '/portal/events' : '/portal/players');
    } catch (e: any) {
      setErr(e?.message || 'Could not save profile');
      setSaving(false);
    }
  };

  if (loading) return <main className="min-h-screen grid place-items-center p-8">Loading profile…</main>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <img src="/images/nco-logo.png" alt="NCO" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-[#0A3161]">Complete your profile</h1>
          <p className="text-gray-600">{email}</p>
          <p className="mt-1 text-xs text-gray-500">Role: <strong>{role}</strong></p>
        </div>

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" value={form.first_name} onChange={(v)=>update('first_name', v)} required />
            <Field label="Last name"  value={form.last_name}  onChange={(v)=>update('last_name', v)} required />
          </div>

          {role === 'organizer' && (
            <Field label="Organization" value={form.organization} onChange={(v)=>update('organization', v)} required />
          )}

          <Field label="Phone" value={form.phone} onChange={(v)=>update('phone', v)} placeholder="(optional)" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City" value={form.city} onChange={(v)=>update('city', v)} required />
            <Field label="State/Region" value={form.region} onChange={(v)=>update('region', v)} required />
            <Field label="Country" value={form.country} onChange={(v)=>update('country', v)} />
          </div>

          <button
            disabled={saving}
            className="mt-2 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#0A3161' }}
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required=false, placeholder='' }:{
  label: string; value: string; onChange: (v:string)=>void; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}{required && ' *'}</span>
      <input
        type="text"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
      />
    </label>
  );
}