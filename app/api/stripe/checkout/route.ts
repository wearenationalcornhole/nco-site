import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { CUSTOM_BAG_CART_SLUG } from '@/app/lib/bagMakerConfig'
import { listStoreProducts } from '@/app/lib/store/catalog'
import { isCustomBagCartItem, normalizePersistedCartItems } from '@/app/lib/shopCart'

export const runtime = 'nodejs'

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    process.env.APP_ORIGIN?.replace(/\/$/, '') ||
    new URL(request.url).origin
  )
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

export async function POST(request: Request) {
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured.' },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const rawItems = normalizePersistedCartItems(body?.items)
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
  }

  const products = await listStoreProducts()
  const origin = getSiteUrl(request)

  const customDesignIds: string[] = []

  const lineItems = rawItems.map((item) => {
    if (isCustomBagCartItem(item)) {
      customDesignIds.push(item.designId)
      return {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: item.unitPrice,
          product_data: {
            name: item.title,
            description: `${item.description} Design ${item.designId}.`,
            images: /^https?:\/\//.test(item.proofUrl) ? [item.proofUrl] : undefined,
            metadata: {
              slug: CUSTOM_BAG_CART_SLUG,
              category: item.category,
              design_id: item.designId,
              item_type: 'custom_bag' as const,
              bag_color_hex: item.bagColorHex,
            },
          },
        },
      }
    }

    const product = products.find((candidate) => candidate.slug === item.slug)
    const quantity = Math.max(1, Math.min(10, Number(item.quantity ?? 1)))

    if (!product) {
      throw new Error(`Unknown product: ${item.slug ?? 'missing slug'}`)
    }

    if (product.inventoryStatus === 'sold_out') {
      throw new Error(`${product.title} is sold out.`)
    }

    return {
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: product.price,
        product_data: {
          name: product.title,
          description: product.shortDescription,
          images: product.images.length > 0 ? [`${origin}${product.images[0]}`] : undefined,
          metadata: {
            slug: product.slug,
            category: product.category,
            design_id: null,
            item_type: 'catalog',
            bag_color_hex: null,
          },
        },
      },
    }
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems as any,
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        source: 'nco-store-mvp',
        cart_count: String(rawItems.length),
        custom_design_ids: customDesignIds.join(','),
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe Checkout session did not return a URL.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Stripe Checkout session.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
