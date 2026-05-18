export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import {
  archiveBagDesign,
  getBagDesignForActor,
  mergeBagDesignColorFromCmyk,
  normalizeBagDesignJson,
  sanitizeBagDesignForActor,
  updateBagDesign,
} from '@/app/lib/bagMakerData'
import { requireRouteRoles } from '@/app/lib/portalRouteAccess'

function parseId(context: any) {
  return String(context?.params?.id ?? '').trim()
}

export async function GET(_request: Request, context: any) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const id = parseId(context)
    if (!id) {
      return NextResponse.json({ error: 'Bag design id is required.' }, { status: 400 })
    }

    const design = await getBagDesignForActor(access.actor, id)
    if (!design) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    return NextResponse.json(sanitizeBagDesignForActor(access.actor, design))
  } catch (error: any) {
    console.error('GET /portal/api/bag-designs/[id] error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load bag design.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const id = parseId(context)
    if (!id) {
      return NextResponse.json({ error: 'Bag design id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    let colorHex =
      typeof body?.bagColorHex === 'string' && body.bagColorHex ? body.bagColorHex : undefined
    let colorCmyk = body?.bagColorCmyk ?? undefined

    if (!colorHex && colorCmyk) {
      colorHex = mergeBagDesignColorFromCmyk(colorCmyk).bagColorHex
      colorCmyk = mergeBagDesignColorFromCmyk(colorCmyk).bagColorCmyk
    }

    const designJson = body?.designJson
      ? normalizeBagDesignJson(body.designJson, colorHex ?? '#ffffff')
      : undefined

    const updated = await updateBagDesign(access.actor, id, {
      event_id:
        body?.eventId === null ? null : typeof body?.eventId === 'string' ? body.eventId : undefined,
      club_id:
        body?.clubId === null ? null : typeof body?.clubId === 'string' ? body.clubId : undefined,
      status: typeof body?.status === 'string' ? body.status : undefined,
      bag_color_hex: colorHex,
      bag_color_cmyk: colorCmyk,
      design_json: designJson,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    return NextResponse.json(sanitizeBagDesignForActor(access.actor, updated))
  } catch (error: any) {
    console.error('PATCH /portal/api/bag-designs/[id] error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update bag design.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: any) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const id = parseId(context)
    if (!id) {
      return NextResponse.json({ error: 'Bag design id is required.' }, { status: 400 })
    }

    const archived = await archiveBagDesign(access.actor, id)
    if (!archived) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('DELETE /portal/api/bag-designs/[id] error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to archive bag design.' }, { status: 500 })
  }
}
