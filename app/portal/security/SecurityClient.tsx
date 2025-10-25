'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Role = 'admin' | 'organizer' | 'player';

export default function SecurityClient({ role }: { role: Role }) {
  const supabase = createClientComponentClient();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Detect whether passkeys are available on this project + browser
    const hasAPI = typeof (navigator as any).credentials !== 'undefined';
    const hasSupabase = typeof (supabase.auth as any).webauthn !== 'undefined';
    setSupported(hasAPI && hasSupabase);
  }, [supabase]);

  async function registerPasskey() {
    setBusy(true); setMsg(null);
    try {
      // @ts-ignore – feature-gated at runtime
      const res = await (supabase.auth as any).webauthn.register();
      if (res?.error) throw res.error;
      setMsg('Passkey registered on this device.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Passkey registration failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold text-[#0A3161]">Security</h1>
      <p className="text-gray-600 mt-1">Passwordless sign-in and device trust.</p>

      <div className="mt-6 grid gap-6 max-w-xl">
        {/* Persistent session explainer */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Remember this device</h2>
          <p className="text-sm text-gray-700 mt-1">
            You stay signed in on this browser for up to 90 days unless you log out or clear cookies.
          </p>
        </div>

        {/* Passkeys */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Passkeys (FaceID / TouchID)</h2>
          {supported ? (
            role === 'admin' || role === 'organizer' ? (
              <>
                <p className="text-sm text-gray-700 mt-1">
                  Register a passkey on this device to sign in without email. Works with FaceID, TouchID, Windows Hello, and hardware keys.
                </p>
                <button
                  onClick={registerPasskey}
                  disabled={busy}
                  className="mt-3 rounded bg-[#0A3161] text-white px-4 py-2 disabled:opacity-50"
                >
                  {busy ? 'Registering…' : 'Register passkey on this device'}
                </button>
                {msg && <p className="mt-2 text-sm">{msg}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-600">Passkeys are currently available for organizers and admins.</p>
            )
          ) : (
            <p className="text-sm text-gray-600">
              Passkeys aren’t available on this project or browser yet. You can still sign in with magic links.
            </p>
          )}
        </div>

        <div className="text-sm">
          <Link href="/portal/dashboard" className="text-[#0A3161] underline">← Back to dashboard</Link>
        </div>
      </div>
    </main>
  );
}