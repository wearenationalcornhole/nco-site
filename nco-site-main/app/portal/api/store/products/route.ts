export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import {
  listAdminStoreProducts,
  type InventoryStatus,
  type StoreProductUpsertInput,
  upsertStoreProduct,
} from '@/app/lib/store/catalog'

type Body = {
  title?: string
  slug?: string
  price?: number
  category?: string
  description?: string
  shortDescription?: string
  images?: string[]
  bagSpecs?: {
    series?: string
    fill?: string
    material?: string
    weight?: string
    size?: string
    breakIn?: string
  }
  speedRating?: number
  controlRating?: number
  inventoryStatus?: InventoryStatus
  featured?: boolean
  isActive?: boolean
}

async function requireAdmin() {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseBody(body: Body): StoreProductUpsertInput {
  const title = String(body.title ?? '').trim()
  const slug = slugify(String(body.slug ?? '').trim() || title)
  const category = String(body.category ?? '').trim()
  const description = String(body.description ?? '').trim()
  const shortDescription = String(body.shortDescription ?? '').trim()
  const images = Array.isArray(body.images)
    ? body.images.map((image) => String(image).trim()).filter(Boolean)
    : []

  if (!title || !slug || !category || !description || !shortDescription) {
    throw new Error('Title, slug, category, description, and short description are required')
  }

  const bagSpecs = {
    series: String(body.bagSpecs?.series ?? '').trim() || 'N/A',
    fill: String(body.bagSpecs?.fill ?? '').trim() || 'N/A',
    material: String(body.bagSpecs?.material ?? '').trim() || 'N/A',
    weight: String(body.bagSpecs?.weight ?? '').trim() || 'N/A',
    size: String(body.bagSpecs?.size ?? '').trim() || 'N/A',
    breakIn: String(body.bagSpecs?.breakIn ?? '').trim() || 'N/A',
  }

  return {
    title,
    slug,
    price: Math.max(0, Math.round(Number(body.price ?? 0))),
    category,
    description,
    shortDescription,
    images,
    bagSpecs,
    speedRating: Math.max(0, Math.min(10, Number(body.speedRating ?? 0))),
    controlRating: Math.max(0, Math.min(10, Number(body.controlRating ?? 0))),
    inventoryStatus: body.inventoryStatus ?? 'in_stock',
    featured: Boolean(body.featured),
    isActive: body.isActive !== false,
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const products = await listAdminStoreProducts()
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const input = parseBody(body)
    const created = await upsertStoreProduct(input)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Invalid payload' }, { status: 400 })
  }
}
