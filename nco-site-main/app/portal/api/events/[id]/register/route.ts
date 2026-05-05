// app/portal/api/events/[id]/register/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/app/lib/supabaseServer';
import { getPrisma } from '@/app/lib/safePrisma';
import { devStore } from '@/app/lib/devStore';
import { getEventRegistrationConfig } from '@/app/lib/eventRegistration';

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getEventRecord(id: string) {
  const prisma = await getPrisma();

  if (prisma) {
    const event = isUuidLike(id)
      ? await prisma.events.findFirst({
          where: { OR: [{ id }, { slug: id }] },
          select: { id: true, slug: true, title: true },
        })
      : await prisma.events.findFirst({
          where: { slug: id },
          select: { id: true, slug: true, title: true },
        });

    return { prisma, event };
  }

  const event = devStore
    .getAll<any>('events')
    .find((item) => item.id === id || item.slug === id);

  return {
    prisma: null,
    event: event ? { id: String(event.id), slug: event.slug ?? null, title: String(event.title ?? '') } : null,
  };
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id: string };
    if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

    const { prisma, event } = await getEventRecord(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registrationConfig = getEventRegistrationConfig(event);
    if (registrationConfig.mode === 'paid') {
      return NextResponse.json(
        { error: 'Paid registration requires checkout first' },
        { status: 402 }
      );
    }

    // ⬅️ IMPORTANT: await the server client
    const supabase = await getSupabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    if (prisma) {
      const exists = await prisma.registrations.findFirst({
        where: { event_id: event.id, user_id: userId },
      });
      if (exists) {
        return NextResponse.json({ error: 'Already registered' }, { status: 400 });
      }
      const created = await prisma.registrations.create({
        data: { event_id: event.id, user_id: userId },
      });
      return NextResponse.json(created, { status: 201 });
    }

    // dev fallback
    const already = devStore
      .getAll('registrations')
      .find((r: any) => r.event_id === event.id && r.user_id === userId);
    if (already) {
      return NextResponse.json({ error: 'Already registered' }, { status: 400 });
    }

    const created = devStore.upsert('registrations', {
      event_id: event.id,
      user_id: userId,
      created_at: new Date(),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error('POST /portal/api/events/[id]/register error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
