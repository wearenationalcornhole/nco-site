// app/portal/page.tsx
export const revalidate = 0;
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/app/lib/auth';

export default async function PortalIndex() {
  const supabase = await getSupabaseServer(); // ✅ await the client
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