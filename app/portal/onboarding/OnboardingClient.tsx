'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'organizer' | 'player';

type ProfileRow = {
  role: Role | null;
  is_profile_complete: boolean | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  organization: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  avatar_url: string | null;
  primary_club_id: string | null;
};

type Club = { id: string; name: string };

export default function OnboardingClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('player');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('US');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // clubs
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<string>(''); // '' = none

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        if (!user) { router.replace('/portal/login'); return; }
        setEmail(user.email ?? null);

        // Load clubs
        const { data: clubRows, error: cerr } = await supabase
          .from('clubs')
          .select('id,name')
          .order('name', { ascending: true });
        if (cerr) throw cerr;
        setClubs(clubRows ?? []);

        // Load profile
        const { data: p, error: perr } = await supabase
          .from('profiles')
          .select('role,is_profile_complete,first_name,last_name,phone,organization,city,region,country,avatar_url,primary_club_id')
          .maybeSingle<ProfileRow>();
        if (perr) throw perr;

        if (p?.role) setRole(p.role);
        if (p?.is_profile_complete) {
          router.replace('/portal/dashboard');
          return;
        }

        setFirst(p?.first_name ?? '');
        setLast(p?.last_name ?? '');
        setPhone(p?.phone ?? '');
        setOrg(p?.organization ?? '');
        setCity(p?.city ?? '');
        setRegion(p?.region ?? '');
        setCountry(p?.country ?? 'US');
        setAvatarUrl(p?.avatar_url ?? null);
        setClubId(p?.primary_club_id ?? '');

        setLoading(false);
      } catch (e: any) {
        console.error('onboarding init error', e);
        setErr(e?.message || 'Failed to load onboarding');
        setLoading(false);
      }
    };
    run();
  }, [router, supabase]);

  const handleAvatarPick = (f: File | null) => setAvatarFile(f);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/portal/login'); return; }

      // Minimal client validation
      if (!first || !last || !city || !region) {
        throw new Error('Please fill first name, last name, city, and state/region.');
      }
      if (role === 'organizer' && !org) {
        throw new Error('Please add your organization.');
      }

      // Upload avatar if provided
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, {
          cacheControl: '3600', upsert: false
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        newAvatarUrl = pub.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: first,
          last_name: last,
          phone: phone || null,
          organization: role === 'organizer' ? org : null,
          city, region, country,
          avatar_url: newAvatarUrl,
          primary_club_id: role === 'player' ? (clubId || null) : null
        })
        .eq('id', (await supabase.auth.getUser()).data.user!.id);

      if (error) throw error;

      router.replace('/portal/dashboard');
    } catch (e: any) {
      console.error('onboarding save error:', e);
      setErr(e?.message || 'Could not save your profile');
      setSaving(false);
    }
  };

  if (loading) return <main className="min-h-screen grid place-items-center p-10">Loading onboarding…</main>;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <img src="/images/nco-mark.png" alt="NCO" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-[#0A3161]">Complete your profile</h1>
          <p className="text-gray-600">{email}</p>
          <p className="mt-1 text-xs text-gray-500">Role: <strong>{role}</strong></p>
        </div>

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        <form onSubmit={submit} className="grid gap-4">
          {/* Avatar */}
          <div className="grid sm:grid-cols-[112px,1fr] gap-4 items-center">
            <div className="justify-self-center">
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : (avatarUrl || '/images/nco-mark.webp')}
                alt="Avatar"
                className="h-24 w-24 object-cover rounded-full border border-gray-300"
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Profile image (optional)</span>
              <input type="file" accept="image/*" onChange={(e)=>handleAvatarPick(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
              <span className="text-xs text-gray-500">JPG/PNG/WebP. Public for in-app display.</span>
            </label>
          </div>

          {/* Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" value={first} onChange={setFirst} required />
            <Field label="Last name"  value={last}  onChange={setLast}  required />
          </div>

          {/* Organizer-only */}
          {role === 'organizer' && (
            <Field label="Organization" value={org} onChange={setOrg} required />
          )}

          {/* Location */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City" value={city} onChange={setCity} required />
            <Field label="State/Region" value={region} onChange={setRegion} required />
            <Field label="Country" value={country} onChange={setCountry} />
          </div>

          {/* Contact */}
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="(optional)" />

          {/* Player: club selection */}
          {role === 'player' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Club (optional)</span>
              <select
                value={clubId}
                onChange={(e)=>setClubId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">— No club / Independent —</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="text-xs text-gray-500">Don’t see your club? We’ll add it soon—profiles are editable later.</span>
            </label>
          )}

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
  label: string; value: string; onChange: (v:string)=>void; required?: boolean; placeholder?: string
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