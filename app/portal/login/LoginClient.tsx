'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginClient() {
  const supabase = createClientComponentClient(); // ← use helpers client
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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo }
    });

    if (error) { setStatus('error'); setMsg(error.message || 'Sign-in failed.'); return; }
    setStatus('sent'); setMsg('Magic link sent! Check your email.');
  };

  /* …rest of your component unchanged… */
}