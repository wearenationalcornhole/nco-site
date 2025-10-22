'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [msg, setMsg] = useState('');
  const [redirect, setRedirect] = useState('/portal');
  const router = useRouter();

  useEffect(() => {
    // Read ?redirect=... from the real URL safely on the client
    const url = new URL(window.location.href);
    setRedirect(url.searchParams.get('redirect') || '/portal');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      }
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <div className="text-center mb-6">
          <img src="/images/nco-mark.svg" alt="NCO" className="h-14 mx-auto mb-2" />
          <h1 className="text-xl font-semibold text-[#0A3161]">National Cornhole Portal</h1>
          <p className="text-sm text-gray-600">Sign in with a one-time magic link</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@wearenationalcornhole.com"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-[#0A3161]/20"
          />
          <button
            disabled={status==='sending'}
            className="w-full rounded-lg px-4 py-2 font-semibold text-white bg-[#B31942] disabled:opacity-60"
          >
            {status==='sending' ? 'Sending…' : 'Email me a magic link'}
          </button>
        </form>

        {!!msg && (
          <p className={`mt-4 text-sm ${status==='error' ? 'text-red-600' : 'text-green-700'}`}>
            {msg}
          </p>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          Need help? contact@wearenationalcornhole.com
        </p>
      </div>
    </main>
  );
}