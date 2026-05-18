export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import crypto from 'node:crypto'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import {
  createStorageAccessUrl,
  createBagDesignAsset,
  getAssetSlotType,
  getBagDesignForActor,
  getSupabaseAdminSafe,
  sanitizeBagDesignForActor,
} from '@/app/lib/bagMakerData'
import { requireRouteRoles } from '@/app/lib/portalRouteAccess'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ASSET_BUCKET = 'bag-design-assets'

function getDesignId(context: any) {
  return String(context?.params?.id ?? '').trim()
}

function getAssetSlot(value: FormDataEntryValue | null) {
  if (value === 'slow_main' || value === 'fast_main' || value === 'organizer_logo') {
    return value
  }
  return null
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
}

function toDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function POST(request: Request, context: any) {
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

    const form = await request.formData()
    const slot = getAssetSlot(form.get('slot'))
    const file = form.get('file')

    if (!slot) {
      return NextResponse.json({ error: 'Upload slot is required.' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A PNG or JPEG file is required.' }, { status: 400 })
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG and JPEG uploads are supported in V1.' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Upload is too large. Please keep files under 10MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(buffer).metadata()
    const assetId = crypto.randomUUID()
    const safeName = sanitizeFilename(file.name || `${slot}.png`)
    const objectPath = `${designId}/${assetId}-${safeName}`
    let fileUrl = ''
    let storagePath: string | null = null

    const supabaseAdmin = await getSupabaseAdminSafe()
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.storage.from(ASSET_BUCKET).upload(objectPath, buffer, {
        contentType: file.type,
        upsert: true,
      })

      if (!error) {
        storagePath = `${ASSET_BUCKET}/${objectPath}`
        fileUrl = await createStorageAccessUrl(storagePath, '')
      } else if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            error:
              'Supabase Storage bucket "bag-design-assets" is not ready. Create it before uploading bag maker assets.',
          },
          { status: 500 },
        )
      }
    }

    if (!fileUrl) {
      fileUrl = toDataUrl(buffer, file.type)
    }

    const updated = await createBagDesignAsset(
      access.actor,
      designId,
      {
        bag_design_id: designId,
        asset_type: getAssetSlotType(slot),
        file_url: fileUrl,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        width_px: metadata.width ?? null,
        height_px: metadata.height ?? null,
      },
      slot,
    )

    if (!updated) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    return NextResponse.json(sanitizeBagDesignForActor(access.actor, updated))
  } catch (error: any) {
    console.error('POST /portal/api/bag-designs/[id]/upload error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to upload bag maker asset.' }, { status: 500 })
  }
}
