// app/portal/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/supabaseServer';

export default async function PortalIndex() {
  // ✅ Do NOT await this — it’s synchronous now
  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → magic-link page (and bounce to dashboard after auth)
  if (!user) {
    redirect('/portal/login?redirect=%2Fportal%2Fdashboard');
  }

  // Logged in → dashboard (which will route to onboarding/profile if needed)
  redirect('/portal/dashboard');
}