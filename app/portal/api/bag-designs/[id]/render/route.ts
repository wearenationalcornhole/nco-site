export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { emitBagProofGeneratedActivity } from '@/app/lib/activityFeed'
import {
  getBagDesignForActor,
  getSupabaseAdminSafe,
  replaceRenderedArt,
} from '@/app/lib/bagMakerData'
import { renderBagDesignBuffers } from '@/app/lib/bagMakerRender'
import { requireRouteRoles } from '@/app/lib/portalRouteAccess'

const GENERATED_BUCKET = 'bag-art'

function getDesignId(context: any) {
  return String(context?.params?.id ?? '').trim()
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

async function uploadGeneratedFile(
  supabaseAdmin: Awaited<ReturnType<typeof getSupabaseAdminSafe>>,
  designId: string,
  fileName: string,
  buffer: Buffer,
) {
  const objectPath = `${designId}/${fileName}`
  if (!supabaseAdmin) {
    return {
      fileUrl: toDataUrl(buffer, 'image/png'),
      storagePath: null,
    }
  }

  const { error } = await supabaseAdmin.storage.from(GENERATED_BUCKET).upload(objectPath, buffer, {
    contentType: 'image/png',
    upsert: true,
  })

  if (error) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase Storage bucket "bag-art" is not ready. Create it before rendering production art.')
    }

    return {
      fileUrl: toDataUrl(buffer, 'image/png'),
      storagePath: null,
    }
  }

  const { data } = supabaseAdmin.storage.from(GENERATED_BUCKET).getPublicUrl(objectPath)
  return {
    fileUrl: data.publicUrl,
    storagePath: `${GENERATED_BUCKET}/${objectPath}`,
  }
}

export async function POST(_request: Request, context: any) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const designId = getDesignId(context)
    if (!designId) {
      return NextResponse.json({ error: 'Bag design id is required.' }, { status: 400 })
    }

    const design = await getBagDesignForActor(access.actor, designId)
    if (!design) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    const rendered = await renderBagDesignBuffers(design)
    const supabaseAdmin = await getSupabaseAdminSafe()

    const [slowSide, fastSide, proof] = await Promise.all([
      uploadGeneratedFile(supabaseAdmin, designId, 'slow-side-production.png', rendered.slowSide),
      uploadGeneratedFile(supabaseAdmin, designId, 'fast-side-production.png', rendered.fastSide),
      uploadGeneratedFile(supabaseAdmin, designId, 'customer-proof.png', rendered.proof),
    ])

    const updated = await replaceRenderedArt(access.actor, designId, {
      slowSideArtUrl: slowSide.fileUrl,
      slowSideStoragePath: slowSide.storagePath,
      fastSideArtUrl: fastSide.fileUrl,
      fastSideStoragePath: fastSide.storagePath,
      proofUrl: proof.fileUrl,
      proofStoragePath: proof.storagePath,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    await emitBagProofGeneratedActivity({
      actorProfileId: updated.profile_id,
      designId: updated.id,
      eventId: updated.event_id,
      clubId: updated.club_id,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('POST /portal/api/bag-designs/[id]/render error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to render bag art.' }, { status: 500 })
  }
}
