// app/portal/api/notify-approval-batch/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

type Body = {
  eventId: string;
  files: { filePath: string }[];
};

function isUuidV4ish(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { eventId, files }: Body = await req.json();
    if (!eventId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Missing eventId or files' }, { status: 400 });
    }

    // Role check: admin OR organizer of event
    const [{ data: me }, { data: org }] = await Promise.all([
      supabase.from('profiles').select('role,email,first_name,last_name').eq('id', user.id).maybeSingle(),
      supabase.from('event_admins').select('event_id').eq('event_id', eventId).eq('user_id', user.id).maybeSingle(),
    ]);
    const isAdmin = me?.role === 'admin';
    const isOrganizer = !!org;
    if (!isAdmin && !isOrganizer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enrich title/slug for email
    let title = eventId;
    if (isUuidV4ish(eventId)) {
      const { data: ev } = await supabase
        .from('events')
        .select('title,slug')
        .eq('id', eventId)
        .maybeSingle();
      if (ev?.title) title = ev.title;
      else if (ev?.slug) title = ev.slug;
    }

    const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
    const to = process.env.ADMIN_NOTIFY_TO ?? 'greg@wearenationalcornhole.com';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const moderatorName =
      [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.email || user.email || user.id;

    const galleryLink = `${origin}/portal/demo-bags/${eventId}`;
    const subject = `BATCH APPROVAL: ${files.length} demo bag${files.length === 1 ? '' : 's'} for ${title}`;

    const listHtml = files
      .map((f) => `<li style="margin:2px 0">${f.filePath}</li>`)
      .join('');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 8px">Batch Demo Approval</h2>
        <p style="margin:0 0 8px"><strong>Event:</strong> ${title}</p>
        <p style="margin:0 0 8px"><strong>Approved by:</strong> ${moderatorName}</p>
        <p style="margin:12px 0 4px"><strong>Files:</strong></p>
        <ul style="padding-left:18px;margin:0 0 12px">${listHtml}</ul>
        <p style="margin:16px 0 8px">
          <a href="${galleryLink}" style="background:#0A3161;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;display:inline-block">Open Gallery</a>
        </p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
        <p style="margin:0;color:#444">Approving demos starts production and incurs costs.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER!,
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('notify-approval-batch error', e);
    return NextResponse.json({ error: e?.message || 'Batch email failed' }, { status: 500 });
  }
}