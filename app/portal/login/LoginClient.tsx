'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginClient() {
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [msg, setMsg] = useState('');
  const [redirect, setRedirect] = useState('/portal/dashboard');

  useEffect(() => {
    const url = new URL(window.location.href);
    const r = url.searchParams.get('redirect');
    setRedirect(r && r.startsWith('/portal') ? r : '/portal/dashboard');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setMsg('');

    const emailRedirectTo =
     `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

    // temporary redirect
    //const emailRedirectTo =
        //`${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/whoami')}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      setStatus('error');
      setMsg(error.message || 'Sign-in failed. Please try again.');
      return;
    }

    setStatus('sent');
    setMsg('Magic link sent! Check your email.');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="h-2 w-full" style={{ backgroundColor: '#0A3161' }} />
      <section className="mx-auto max-w-xl px-6 py-12">
        <div className="flex flex-col items-center">
          <img src="/images/nco-logo.png" alt="National Cornhole Organization" className="h-16 mb-4" />
          <h1 className="text-2xl font-semibold" style={{ color: '#0A3161' }}>National Cornhole Portal</h1>
          <p className="text-sm text-gray-600">No password needed — we’ll email you a secure one-time link.</p>
        </div>

        <div className="mt-8 rounded-2xl bg-white shadow-lg ring-1 ring-gray-100">
          <div className="p-6 sm:p-8">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                />
              </label>

              <button
                disabled={status==='sending'}
                className="w-full rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#B31942' }}
              >
                {status==='sending' ? 'Sending…' : 'Email me a magic link'}
              </button>

              {!!msg && (
                <p className={`text-sm ${status==='error' ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>
              )}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}