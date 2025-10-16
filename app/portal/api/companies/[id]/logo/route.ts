export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

const BUCKET = process.env.SUPABASE_BUCKET_LOGOS || 'logos'

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params as { id: string }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }

    const arrayBuf = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)
    const objectKey = `companies/${id}/${hash}.${ext}`

    // Upload to Supabase Storage
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectKey, buf, {
        contentType: file.type || 'image/png',
        upsert: true,
      })
    if (upErr) {
      console.error('upload error:', upErr)
      return NextResponse.json({ error: 'upload failed' }, { status: 500 })
    }

    // Signed URL (7 days)
    const { data: signed, error: urlErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(objectKey, 60 * 60 * 24 * 7)
    if (urlErr) {
      console.error('signed url error:', urlErr)
      return NextResponse.json({ error: 'url failed' }, { status: 500 })
    }

    const prisma = await getPrisma()
    if (prisma) {
      const SponsorCompanies = (prisma as any).sponsor_companies
      if (!SponsorCompanies) throw new Error('Model sponsor_companies not found')
      const updated = await SponsorCompanies.update({
        where: { id },
        data: { logo_url: signed.signedUrl, logo_hash: hash },
      })
      return NextResponse.json({ ok: true, company: updated })
    }

    // devStore fallback (cast to any to satisfy TableName union)
    const updated = (devStore as any).upsert('sponsor_companies', {
      id,
      logoUrl: signed.signedUrl,
      logoHash: hash,
    })
    return NextResponse.json({ ok: true, company: updated })
  } catch (e: any) {
    console.error('POST /portal/api/companies/[id]/logo error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}