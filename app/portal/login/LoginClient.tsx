'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginClient() {
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [redirect, setRedirect] = useState('/portal');
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    // capture ?redirect=/some/path
    const url = new URL(window.location.href);
    setRedirect(url.searchParams.get('redirect') || '/portal');

    // feature-detect passkeys (WebAuthn) availability
    const hasAPI = typeof (navigator as any).credentials !== 'undefined';
    const hasSupabase = typeof (supabase.auth as any).webauthn !== 'undefined';
    setPasskeySupported(hasAPI && hasSupabase);
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            redirect
          )}`,
        },
      });
      if (error) throw error;
      setStatus('sent');
      setMsg('Magic link sent! Check your email.');
    } catch (err: any) {
      setStatus('error');
      setMsg(err?.message || 'Sign-in failed.');
    }
  };

  async function signInWithPasskey() {
    setStatus('sending');
    setMsg('');
    try {
      // @ts-ignore - gated at runtime
      const res = await (supabase.auth as any).webauthn.signIn();
      if (res?.error) throw res.error;
      window.location.href = redirect || '/portal';
    } catch (e: any) {
      setStatus('error');
      setMsg(e?.message || 'Passkey sign-in failed.');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="h-2 w-full" style={{ backgroundColor: '#0A3161' }} />
      <section className="mx-auto max-w-xl px-6 py-12">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/nco-mark.png" alt="National Cornhole Organization" className="h-16 mb-4" />
          <h1 className="text-2xl font-semibold" style={{ color: '#0A3161' }}>
            National Cornhole Portal
          </h1>
          <p className="text-sm text-gray-600">Passwordless sign-in</p>
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                />
              </label>

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#B31942' }}
              >
                {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
              </button>

              {passkeySupported && (
                <button
                  type="button"
                  onClick={signInWithPasskey}
                  disabled={status === 'sending'}
                  className="w-full rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#0A3161' }}
                >
                  Sign in with passkey
                </button>
              )}

              {!!msg && (
                <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>
              )}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}