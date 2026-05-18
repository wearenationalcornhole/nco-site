import type { InventoryStatus, Product } from '@/app/lib/store/catalog'

export type CatalogCartItem = {
  kind: 'catalog'
  slug: string
  quantity: number
}

export type CustomBagCartItem = {
  kind: 'custom_bag'
  slug: string
  quantity: number
  designId: string
  title: string
  category: string
  description: string
  image: string
  unitPrice: number
  bagColorHex: string
  proofUrl: string
  slowSideArtUrl: string
  fastSideArtUrl: string
}

export type PersistedCartItem = CatalogCartItem | CustomBagCartItem

export type ResolvedCartEntry = {
  key: string
  kind: 'catalog' | 'custom_bag'
  slug: string
  quantity: number
  title: string
  category: string
  description: string
  image: string | null
  unitPrice: number
  lineTotal: number
  inventoryStatus: InventoryStatus | 'custom_order'
  designId?: string
  bagColorHex?: string
  proofUrl?: string
  slowSideArtUrl?: string
  fastSideArtUrl?: string
}

export const SHOP_CART_STORAGE_KEY = 'nco-shop-cart'

export function isCustomBagCartItem(item: PersistedCartItem): item is CustomBagCartItem {
  return item.kind === 'custom_bag'
}

export function getCartItemKey(item: PersistedCartItem) {
  if (isCustomBagCartItem(item)) {
    return `custom_bag:${item.designId}`
  }
  return `catalog:${item.slug}`
}

function isPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function normalizePersistedCartItems(value: unknown): PersistedCartItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const raw = item as Record<string, unknown>
      const slug = typeof raw.slug === 'string' ? raw.slug.trim() : ''
      const quantity = Math.max(1, Math.min(10, Number(raw.quantity ?? 1)))

      if (!slug || !Number.isFinite(quantity)) return null

      if (raw.kind === 'custom_bag') {
        const designId = typeof raw.designId === 'string' ? raw.designId.trim() : ''
        const title = typeof raw.title === 'string' ? raw.title.trim() : ''
        const category = typeof raw.category === 'string' ? raw.category.trim() : ''
        const description = typeof raw.description === 'string' ? raw.description.trim() : ''
        const image = typeof raw.image === 'string' ? raw.image.trim() : ''
        const unitPrice = Number(raw.unitPrice ?? 0)
        const bagColorHex = typeof raw.bagColorHex === 'string' ? raw.bagColorHex.trim() : '#ffffff'
        const proofUrl = typeof raw.proofUrl === 'string' ? raw.proofUrl.trim() : ''
        const slowSideArtUrl =
          typeof raw.slowSideArtUrl === 'string' ? raw.slowSideArtUrl.trim() : ''
        const fastSideArtUrl =
          typeof raw.fastSideArtUrl === 'string' ? raw.fastSideArtUrl.trim() : ''

        if (
          !designId ||
          !title ||
          !category ||
          !description ||
          !image ||
          !proofUrl ||
          !slowSideArtUrl ||
          !fastSideArtUrl ||
          !isPositiveNumber(unitPrice)
        ) {
          return null
        }

        return {
          kind: 'custom_bag',
          slug,
          quantity,
          designId,
          title,
          category,
          description,
          image,
          unitPrice: Math.round(unitPrice),
          bagColorHex,
          proofUrl,
          slowSideArtUrl,
          fastSideArtUrl,
        } satisfies CustomBagCartItem
      }

      return {
        kind: 'catalog',
        slug,
        quantity,
      } satisfies CatalogCartItem
    })
    .filter((item): item is PersistedCartItem => item !== null)
}

export function resolveCartEntry(item: PersistedCartItem, products: Product[]): ResolvedCartEntry | null {
  if (isCustomBagCartItem(item)) {
    return {
      key: getCartItemKey(item),
      kind: 'custom_bag',
      slug: item.slug,
      quantity: item.quantity,
      title: item.title,
      category: item.category,
      description: item.description,
      image: item.image,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
      inventoryStatus: 'custom_order',
      designId: item.designId,
      bagColorHex: item.bagColorHex,
      proofUrl: item.proofUrl,
      slowSideArtUrl: item.slowSideArtUrl,
      fastSideArtUrl: item.fastSideArtUrl,
    }
  }

  const product = products.find((candidate) => candidate.slug === item.slug)
  if (!product) return null

  return {
    key: getCartItemKey(item),
    kind: 'catalog',
    slug: product.slug,
    quantity: item.quantity,
    title: product.title,
    category: product.category,
    description: product.shortDescription,
    image: product.images[0] ?? null,
    unitPrice: product.price,
    lineTotal: product.price * item.quantity,
    inventoryStatus: product.inventoryStatus,
  }
}

export function readShopCart(): PersistedCartItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY)
    if (!raw) return []
    return normalizePersistedCartItems(JSON.parse(raw))
  } catch {
    window.localStorage.removeItem(SHOP_CART_STORAGE_KEY)
    return []
  }
}

export function writeShopCart(items: PersistedCartItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(items))
}

export function addCatalogCartItem(slug: string, quantity = 1) {
  const items = readShopCart()
  const existing = items.find((item) => !isCustomBagCartItem(item) && item.slug === slug)
  const nextItems: PersistedCartItem[] = existing
    ? items.map((item) =>
        !isCustomBagCartItem(item) && item.slug === slug
          ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
          : item,
      )
    : [
        ...items,
        {
          kind: 'catalog',
          slug,
          quantity: Math.max(1, Math.min(10, quantity)),
        } satisfies CatalogCartItem,
      ]

  writeShopCart(nextItems)
  return nextItems
}

export function upsertCustomBagCartItem(item: CustomBagCartItem) {
  const items = readShopCart().filter(
    (current) => !(isCustomBagCartItem(current) && current.designId === item.designId),
  )
  items.push({
    ...item,
    quantity: Math.max(1, Math.min(10, item.quantity)),
  })
  writeShopCart(items)
  return items
}
