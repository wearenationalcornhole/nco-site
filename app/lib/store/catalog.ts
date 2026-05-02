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

const PRODUCTS: Product[] = [
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

export function getAllProducts() {
  return PRODUCTS
}

export function getFeaturedProducts() {
  return PRODUCTS.filter((product) => product.featured)
}

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug) ?? null
}

export function getRelatedProducts(slug: string, limit = 3) {
  const current = getProductBySlug(slug)
  if (!current) return PRODUCTS.slice(0, limit)

  return PRODUCTS.filter((product) => product.slug !== slug)
    .sort((a, b) => {
      if (a.category === current.category && b.category !== current.category) return -1
      if (b.category === current.category && a.category !== current.category) return 1
      return Number(b.featured) - Number(a.featured)
    })
    .slice(0, limit)
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
