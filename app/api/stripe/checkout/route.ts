import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getAllProducts } from '@/app/lib/store/catalog'

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
  const rawItems = Array.isArray(body?.items) ? body.items : []
  if (rawItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
  }

  const products = getAllProducts()
  const origin = getSiteUrl(request)

  const lineItems = rawItems.map((item: { slug?: string; quantity?: number }) => {
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
          },
        },
      },
    }
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        source: 'nco-store-mvp',
        cart_count: String(rawItems.length),
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
