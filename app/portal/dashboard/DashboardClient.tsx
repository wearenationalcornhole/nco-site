'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'organizer' | 'player' | null;

export default function DashboardClient() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        if (!user) { router.replace('/portal/login'); return; }
        setEmail(user.email ?? null);

        const { data: profile, error: perr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (perr) throw perr;

        const r = (profile?.role as Role) ?? null;
        if (!r) { router.replace('/portal/onboarding'); return; }

        setRole(r);
        setLoading(false);
      } catch (e: any) {
        console.error('dashboard load error', e);
        setErr(e?.message || 'Unknown error');
        setLoading(false);
      }
    };
    run();
  }, [router, supabase]);

  if (loading) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Loading…</main>;
  if (err) {
    return (
      <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
        <div style={{maxWidth:520,background:'#fff',padding:16,borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.08)'}}>
          <h2 style={{color:'#B31942',margin:0}}>Dashboard error</h2>
          <p style={{marginTop:8}}>{err}</p>
          <p style={{fontSize:12,color:'#666'}}>Open DevTools → Console for details.</p>
          <p style={{marginTop:12}}>
            <Link href="/portal/onboarding">Onboarding</Link> · <Link href="/portal/login">Login</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{minHeight:'100vh',padding:24,background:'#f6f7f9'}}>
      <header style={{textAlign:'center',marginBottom:24}}>
        <img src="/images/nco-logo.png" alt="NCO" style={{height:64,display:'block',margin:'0 auto 12px'}} />
        <h1 style={{color:'#0A3161',margin:0}}>National Cornhole Portal</h1>
        <p style={{color:'#555'}}>Welcome{email ? `, ${email}` : ''}! <strong>{role}</strong></p>
      </header>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,maxWidth:960,margin:'0 auto'}}>
        <Card title="Demo Bags" desc="View and share event bag mockups." href="/portal/demo-bags" color="#B31942" />
        {role === 'organizer' ? (
          <>
            <Card title="My Events" desc="Manage tournaments & divisions." href="/portal/events" color="#0A3161" />
            <Card title="Players" desc="Assignments & waitlists." href="/portal/players" color="#0A3161" />
          </>
        ) : (
          <>
            <Card title="Find Events" desc="Browse and join." href="/portal/events" color="#0A3161" />
            <Card title="My Registrations" desc="Your divisions & bags." href="/portal/players" color="#0A3161" />
          </>
        )}
      </div>
    </main>
  );
}

function Card({ title, desc, href, color }:{title:string;desc:string;href:string;color:string}) {
  return (
    <a href={href} style={{
      display:'block',background:'#fff',padding:16,borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,0.08)',
      textDecoration:'none',color:'#222'
    }}>
      <h3 style={{margin:'0 0 6px',color}}>{title}</h3>
      <p style={{margin:0,color:'#555'}}>{desc}</p>
    </a>
  );
}