// app/portal/security/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import SecurityClient from './SecurityClient';

export default async function SecurityPage() {
  // getSupabaseServer is async → await it
  const supabase = await getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/portal/login?redirect=/portal/security');
  }

  // Role gate: only organizer/admin get passkey registration UI
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  const role = me?.role ?? 'player';
  return <SecurityClient role={role} />;
}