// app/portal/api/events/[id]/register/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getPrisma } from '@/app/lib/safePrisma';
import { devStore } from '@/app/lib/devStore';

type RouteParams = { params: { id: string } };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: eventId } = params;

    // Supabase auth context comes from route handler cookies (safe here)
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Try Prisma first (prod path)
    const prisma = await getPrisma();
    if (prisma) {
      // Already registered?
      const existing = await prisma.registrations.findFirst({
        where: { event_id: eventId, user_id: userId },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Already registered' }, { status: 400 });
      }

      const created = await prisma.registrations.create({
        data: {
          event_id: eventId,
          user_id: userId,
          // Optional defaults if your schema allows:
          // status: 'pending',
          // checked_in: false,
        },
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Fallback: devStore (local/dev path)
    const already = devStore
      .getAll<any>('registrations')
      .find((r) => r.event_id === eventId && r.user_id === userId);

    if (already) {
      return NextResponse.json({ error: 'Already registered' }, { status: 400 });
    }

    const created = devStore.upsert('registrations', {
      event_id: eventId,
      user_id: userId,
      created_at: new Date().toISOString(),
      // status: 'pending',
      // checked_in: false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/register error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}