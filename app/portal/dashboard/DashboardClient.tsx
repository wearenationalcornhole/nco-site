'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'player' | 'organizer' | 'admin';

export default function DashboardClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>('player');
  const [first, setFirst] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/portal/login?redirect=%2Fportal%2Fdashboard'); return; }
      setEmail(user.email ?? null);

      const { data: p, error } = await supabase
        .from('profiles')
        .select('role,first_name,avatar_url,is_profile_complete')
        .eq('id', user.id)
        .maybeSingle();

      if (error) { setLoading(false); return; }

      const r = (p?.role as Role) ?? 'player';
      setRole(r);
      setFirst(p?.first_name ?? null);
      setAvatar(p?.avatar_url ?? null);

      if (p && !p.is_profile_complete) {
        router.replace('/portal/onboarding/profile');
        return;
      }

      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <main className="min-h-screen grid place-items-center">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f9f9f9,#e9ecef)] p-8">
      <header className="text-center mb-10">
        <img src="/images/nco-mark.png" alt="NCO" className="mx-auto mb-4 h-16" />
        <h1 className="text-3xl font-semibold text-[#0A3161]">National Cornhole Portal</h1>
        <p className="mt-2 text-gray-600">
          Welcome{first ? `, ${first}` : email ? `, ${email}` : ''}!{' '}
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#0A3161]/10 px-3 py-0.5 text-sm text-[#0A3161]">
            {avatar ? <img src={avatar} alt="" className="h-5 w-5 rounded-full border" /> : null}
            {role}
          </span>
        </p>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {(role === 'organizer' || role === 'admin') ? (
          <>
            <Card title="My Events" desc="Create & manage tournaments." cta="Go to events" href="/portal/events" color="#0A3161" />
            <Card title="Demo Bags" desc="View and share event mockups." cta="Open gallery" href="/portal/demo-bags" color="#B31942" />
            {role === 'admin' && (
              <Card title="Admin Console" desc="Manage access & organizers." cta="Open admin" href="/portal/admin" color="#0A3161" />
            )}
            <Card title="My Registrations" desc="Divisions, statuses & bags." cta="View registrations" href="/portal/players" color="#0A3161" />
          </>
        ) : (
          <>
            <Card title="Find & Join Events" desc="Browse upcoming tournaments." cta="Browse events" href="/portal/events" color="#0A3161" />
            <Card title="My Registrations" desc="Your entries & statuses." cta="View registrations" href="/portal/players" color="#0A3161" />
          </>
        )}
      </section>
    </main>
  );
}

function Card({ title, desc, cta, href, color }:{
  title:string; desc:string; cta:string; href:string; color:string
}) {
  return (
    <Link href={href} className="group block rounded-2xl bg-white p-6 shadow ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-1" style={{ color }}>{title}</h2>
      <p className="text-gray-600 mb-4">{desc}</p>
      <span className="inline-flex items-center font-medium text-white px-4 py-2 rounded" style={{ backgroundColor: color }}>
        {cta}
        <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 11-1.414-1.414L14.586 12H5a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 010-1.414z" />
        </svg>
      </span>
    </Link>
  );
}