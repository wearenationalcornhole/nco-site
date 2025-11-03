// app/portal/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

export default async function PortalIndex() {
  // ✅ Await the Supabase client — getSupabaseServer is async
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → send to login (then bounce back to dashboard)
  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fdashboard');
  }

  // Logged in → redirect to dashboard (dashboard handles onboarding/profile routing)
  redirect('/portal/dashboard');
}