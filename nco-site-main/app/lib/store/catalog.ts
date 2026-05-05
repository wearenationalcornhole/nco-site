import { devStore } from '@/app/lib/devStore'
import { getStoreProductImagesModel, getStoreProductsModel } from '@/app/lib/prismaModels'
import { getPrisma } from '@/app/lib/safePrisma'

export type InventoryStatus = 'in_stock' | 'low_stock' | 'preorder' | 'sold_out'

export type BagSpecs = {
  series: string
  fill: string
  material: string
  weight: string
  size: string
  breakIn: string
}

export type Product = {
  id: string
  title: string
  slug: string
  price: number
  category: string
  description: string
  shortDescription: string
  images: string[]
  bagSpecs: BagSpecs
  speedRating: number
  controlRating: number
  inventoryStatus: InventoryStatus
  featured: boolean
}

export type AdminStoreProduct = Product & {
  isActive: boolean
}

export type StoreProductUpsertInput = {
  id?: string
  title: string
  slug: string
  price: number
  category: string
  description: string
  shortDescription: string
  images: string[]
  bagSpecs: BagSpecs
  speedRating: number
  controlRating: number
  inventoryStatus: InventoryStatus
  featured: boolean
  isActive: boolean
}

type ProductRecord = {
  id?: string
  title: string
  slug: string
  price_cents: number
  category: string
  description: string
  short_description: string
  bag_series: string
  bag_fill: string
  bag_material: string
  bag_weight: string
  bag_size: string
  bag_break_in: string
  speed_rating: number
  control_rating: number
  inventory_status: string
  featured: boolean
  is_active?: boolean
}

type ProductImageRecord = {
  id?: string
  product_id: string
  image_url: string
  sort_order?: number
}

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'flashpoint-pro',
    title: 'Flashpoint Pro',
    slug: 'flashpoint-pro',
    price: 7000,
    category: 'Competition Bags',
    description:
      'Flashpoint Pro is tuned for players who want a clean push path with enough forgiveness to stay confident late in the round. The fast side moves cleanly through traffic while the control side gives you enough bite for blocks, cuts, and tempo shots.',
    shortDescription: 'Balanced all-around competition bag with a dependable push profile.',
    images: ['/images/shop/flashpoint.png', '/images/nco-mark.png'],
    bagSpecs: {
      series: 'Pro Competition',
      fill: 'Premium resin blend',
      material: 'Hybrid fast/slow dual fabric',
      weight: '15.9 oz',
      size: '6 in x 6 in',
      breakIn: 'League-ready after a short break-in period',
    },
    speedRating: 8,
    controlRating: 7,
    inventoryStatus: 'in_stock',
    featured: true,
  },
  {
    id: 'operator-elite',
    title: 'Operator Elite',
    slug: 'operator-elite',
    price: 8000,
    category: 'Competition Bags',
    description:
      'Operator Elite leans toward a faster release for aggressive players who like to pressure the hole. It is built to reward confident slide shots while still giving enough hand feel to shape cuts and drags when the board slows down.',
    shortDescription: 'Faster tournament bag built for assertive, pressure-heavy play.',
    images: ['/images/shop/flashpoint.png', '/images/nco-mark.png'],
    bagSpecs: {
      series: 'Elite Tournament',
      fill: 'Responsive performance resin',
      material: 'Fast-side weave with stable control backing',
      weight: '16.0 oz',
      size: '6 in x 6 in',
      breakIn: 'Optimized for tournament rotation after moderate use',
    },
    speedRating: 9,
    controlRating: 6,
    inventoryStatus: 'low_stock',
    featured: true,
  },
  {
    id: 'nco-classic-tee',
    title: 'NCO Classic Tee',
    slug: 'nco-classic-tee',
    price: 2400,
    category: 'Apparel',
    description:
      'The NCO Classic Tee keeps the brand front and center with a clean athletic fit that works for tournaments, league nights, and travel days. Soft cotton blend construction makes it an easy everyday staple for players and supporters.',
    shortDescription: 'Soft everyday tee with a clean NCO mark and athletic fit.',
    images: ['/images/shop/tee.png', '/images/nco-mark.png'],
    bagSpecs: {
      series: 'Clubhouse Apparel',
      fill: 'N/A',
      material: 'Cotton blend jersey',
      weight: 'Midweight',
      size: 'Unisex sizing',
      breakIn: 'Soft from the first wear',
    },
    speedRating: 0,
    controlRating: 0,
    inventoryStatus: 'preorder',
    featured: false,
  },
]

let storeCatalogTablesReady: boolean | null = null

function normalizeInventoryStatus(value: string | null | undefined): InventoryStatus {
  switch (value) {
    case 'low_stock':
    case 'preorder':
    case 'sold_out':
      return value
    default:
      return 'in_stock'
  }
}

function toProduct(record: ProductRecord, images: ProductImageRecord[]): Product {
  const sortedImages = images
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((item) => item.image_url)
    .filter(Boolean)

  return {
    id: String(record.id ?? record.slug),
    title: record.title,
    slug: record.slug,
    price: Number(record.price_cents ?? 0),
    category: record.category,
    description: record.description,
    shortDescription: record.short_description,
    images: sortedImages.length > 0 ? sortedImages : ['/images/nco-mark.png'],
    bagSpecs: {
      series: record.bag_series,
      fill: record.bag_fill,
      material: record.bag_material,
      weight: record.bag_weight,
      size: record.bag_size,
      breakIn: record.bag_break_in,
    },
    speedRating: Number(record.speed_rating ?? 0),
    controlRating: Number(record.control_rating ?? 0),
    inventoryStatus: normalizeInventoryStatus(record.inventory_status),
    featured: Boolean(record.featured),
  }
}

function cloneFallbackProducts() {
  return FALLBACK_PRODUCTS.map((product) => ({
    ...product,
    images: [...product.images],
    bagSpecs: { ...product.bagSpecs },
  }))
}

function toRecord(input: StoreProductUpsertInput): ProductRecord {
  return {
    ...(input.id ? { id: input.id } : {}),
    title: input.title,
    slug: input.slug,
    price_cents: input.price,
    category: input.category,
    description: input.description,
    short_description: input.shortDescription,
    bag_series: input.bagSpecs.series,
    bag_fill: input.bagSpecs.fill,
    bag_material: input.bagSpecs.material,
    bag_weight: input.bagSpecs.weight,
    bag_size: input.bagSpecs.size,
    bag_break_in: input.bagSpecs.breakIn,
    speed_rating: input.speedRating,
    control_rating: input.controlRating,
    inventory_status: input.inventoryStatus,
    featured: input.featured,
    is_active: input.isActive,
  }
}

function toAdminProduct(product: Product, isActive = true): AdminStoreProduct {
  return {
    ...product,
    isActive,
  }
}

function seedDevStoreProducts() {
  if (devStore.getAll<ProductRecord>('store_products').length > 0) return

  cloneFallbackProducts().forEach((product) => {
    const record = devStore.upsert<ProductRecord>('store_products', toRecord({
      ...product,
      isActive: true,
    }))

    product.images.forEach((image, imageIndex) => {
      devStore.upsert<ProductImageRecord>('store_product_images', {
        product_id: String(record.id ?? product.id),
        image_url: image,
        sort_order: imageIndex,
      })
    })
  })
}

async function listStoreRecords(includeInactive = false) {
  const prisma = await getPrisma()
  const StoreProducts = prisma ? getStoreProductsModel(prisma) : null
  const StoreProductImages = prisma ? getStoreProductImagesModel(prisma) : null

  if (prisma && StoreProducts && StoreProductImages && (await canUseStoreCatalogPersistence(prisma))) {
    try {
      const products = (await StoreProducts.findMany({
        where: includeInactive ? undefined : { is_active: true },
        orderBy: [{ featured: 'desc' }, { created_at: 'desc' }],
      })) as ProductRecord[]

      const productIds = products.map((product) => String(product.id))
      const images =
        productIds.length > 0
          ? ((await StoreProductImages.findMany({
              where: { product_id: { in: productIds } },
              orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
            })) as ProductImageRecord[])
          : []

      const imagesByProduct = new Map<string, ProductImageRecord[]>()
      for (const image of images) {
        const key = String(image.product_id)
        const current = imagesByProduct.get(key) ?? []
        current.push(image)
        imagesByProduct.set(key, current)
      }

      return products.map((product) => ({
        record: product,
        images: imagesByProduct.get(String(product.id)) ?? [],
      }))
    } catch {
      return null
    }
  }

  const products = devStore
    .getAll<ProductRecord>('store_products')
    .filter((product) => includeInactive || product.is_active !== false)
    .sort((a, b) => Number(b.featured) - Number(a.featured))

  if (products.length > 0) {
    const images = devStore.getAll<ProductImageRecord>('store_product_images')
    const imagesByProduct = new Map<string, ProductImageRecord[]>()
    for (const image of images) {
      const key = String(image.product_id)
      const current = imagesByProduct.get(key) ?? []
      current.push(image)
      imagesByProduct.set(key, current)
    }

    return products.map((product) => ({
      record: product,
      images: imagesByProduct.get(String(product.id)) ?? [],
    }))
  }

  return null
}

export async function listStoreProducts(includeInactive = false): Promise<Product[]> {
  const records = await listStoreRecords(includeInactive)
  if (!records) return cloneFallbackProducts()
  return records.map(({ record, images }) => toProduct(record, images))
}

export async function listAdminStoreProducts(): Promise<AdminStoreProduct[]> {
  const records = await listStoreRecords(true)
  if (!records) {
    return cloneFallbackProducts().map((product) => toAdminProduct(product, true))
  }

  return records.map(({ record, images }) =>
    toAdminProduct(toProduct(record, images), record.is_active !== false),
  )
}

export async function listFeaturedProducts() {
  const products = await listStoreProducts(false)
  return products.filter((product) => product.featured)
}

export async function getStoreProductBySlug(slug: string) {
  const products = await listStoreProducts(false)
  return products.find((product) => product.slug === slug) ?? null
}

export async function getRelatedStoreProducts(slug: string, limit = 3) {
  const products = await listStoreProducts(false)
  const current = products.find((product) => product.slug === slug)
  if (!current) return products.slice(0, limit)

  return products
    .filter((product) => product.slug !== slug)
    .sort((a, b) => {
      if (a.category === current.category && b.category !== current.category) return -1
      if (b.category === current.category && a.category !== current.category) return 1
      return Number(b.featured) - Number(a.featured)
    })
    .slice(0, limit)
}

export function getDefaultStoreProducts() {
  return cloneFallbackProducts()
}

export async function getAdminStoreProductById(id: string) {
  const products = await listAdminStoreProducts()
  return products.find((product) => product.id === id) ?? null
}

export async function upsertStoreProduct(input: StoreProductUpsertInput) {
  const prisma = await getPrisma()
  const StoreProducts = prisma ? getStoreProductsModel(prisma) : null
  const StoreProductImages = prisma ? getStoreProductImagesModel(prisma) : null

  if (prisma && StoreProducts && StoreProductImages && (await canUseStoreCatalogPersistence(prisma))) {
    const record = toRecord(input)
    const { id: _ignored, ...data } = record
    const existing = input.id
      ? await StoreProducts.findUnique({ where: { id: input.id }, select: { id: true } }).catch(() => null)
      : null

    const saved = existing
      ? await StoreProducts.update({
          where: { id: existing.id },
          data,
        })
      : await StoreProducts.create({
          data,
        })

    await StoreProductImages.deleteMany({ where: { product_id: saved.id } })
    for (const [index, image] of input.images.filter(Boolean).entries()) {
      await StoreProductImages.create({
        data: {
          product_id: saved.id,
          image_url: image,
          sort_order: index,
        },
      })
    }

    return getAdminStoreProductById(String(saved.id))
  }

  seedDevStoreProducts()

  const current = input.id ? devStore.getById<ProductRecord>('store_products', input.id) : null
  const saved = devStore.upsert<ProductRecord>('store_products', {
    ...toRecord(input),
    ...(current?.id ? { id: current.id } : input.id ? { id: input.id } : {}),
  })

  devStore
    .getAll<ProductImageRecord>('store_product_images')
    .filter((image) => image.product_id === saved.id && image.id)
    .forEach((image) => {
      if (image.id) devStore.remove('store_product_images', image.id)
    })

  input.images.filter(Boolean).forEach((image, index) => {
    devStore.upsert<ProductImageRecord>('store_product_images', {
      product_id: String(saved.id),
      image_url: image,
      sort_order: index,
    })
  })

  return getAdminStoreProductById(String(saved.id))
}

export async function archiveStoreProduct(id: string) {
  const existing = await getAdminStoreProductById(id)
  if (!existing) return null

  return upsertStoreProduct({
    ...existing,
    isActive: false,
  })
}

async function canUseStoreCatalogPersistence(prisma: any) {
  if (!prisma?.$queryRawUnsafe) return false
  if (storeCatalogTablesReady != null) return storeCatalogTablesReady

  try {
    const rows = (await prisma.$queryRawUnsafe(
      "select to_regclass('public.store_products')::text as store_products, to_regclass('public.store_product_images')::text as store_product_images",
    )) as Array<{ store_products: string | null; store_product_images: string | null }>

    const row = rows[0]
    storeCatalogTablesReady = Boolean(row?.store_products && row?.store_product_images)
    return storeCatalogTablesReady
  } catch {
    storeCatalogTablesReady = false
    return false
  }
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function getInventoryLabel(status: InventoryStatus) {
  switch (status) {
    case 'in_stock':
      return 'In Stock'
    case 'low_stock':
      return 'Low Stock'
    case 'preorder':
      return 'Preorder'
    case 'sold_out':
      return 'Sold Out'
  }
}

export function getInventoryTone(status: InventoryStatus): 'green' | 'blue' | 'red' | 'gray' {
  switch (status) {
    case 'in_stock':
      return 'green'
    case 'low_stock':
      return 'blue'
    case 'preorder':
      return 'gray'
    case 'sold_out':
      return 'red'
  }
}
