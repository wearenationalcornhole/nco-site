export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { buildCustomBagCartItem } from '@/app/lib/bagMakerCart'
import { getBagDesignForActor, setBagDesignAddedToCart } from '@/app/lib/bagMakerData'
import { getCartItemKey } from '@/app/lib/shopCart'
import { requireRouteRoles } from '@/app/lib/portalRouteAccess'

function getDesignId(context: any) {
  return String(context?.params?.id ?? '').trim()
}

export async function POST(request: Request, context: any) {
  try {
    const access = await requireRouteRoles(['organizer', 'admin'])
    if ('error' in access) return access.error

    const designId = getDesignId(context)
    if (!designId) {
      return NextResponse.json({ error: 'Bag design id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.approved !== true) {
      return NextResponse.json(
        { error: 'Design approval is required before adding this custom bag to the cart.' },
        { status: 400 },
      )
    }

    const design = await getBagDesignForActor(access.actor, designId)
    if (!design) {
      return NextResponse.json({ error: 'Bag design not found.' }, { status: 404 })
    }

    const cartItem = buildCustomBagCartItem(design)
    const updated = await setBagDesignAddedToCart(access.actor, designId, getCartItemKey(cartItem))

    return NextResponse.json({
      cartItem,
      design: updated ?? design,
    })
  } catch (error: any) {
    console.error('POST /portal/api/bag-designs/[id]/add-to-cart error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to add custom bag to the cart.' }, { status: 500 })
  }
}

