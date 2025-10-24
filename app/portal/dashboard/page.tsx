'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardSmoke() {
  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f6f7f9'}}>
      <div style={{background:'#fff',padding:'24px 32px',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.08)'}}>
        <img src="/images/nco-logo.png" alt="NCO" style={{height:64,display:'block',margin:'0 auto 12px'}} />
        <h1 style={{textAlign:'center',color:'#0A3161'}}>Dashboard (Smoke Test)</h1>
        <p style={{textAlign:'center',color:'#555'}}>If you see this, the callback & routing are good.</p>
      </div>
    </main>
  );
}