import { listStoreProducts } from '@/app/lib/store/catalog'
import ShopCatalogClient from './ShopCatalogClient'

export const metadata = {
  title: 'Shop | National Cornhole Organization',
  description: 'Browse NCO competition bags, apparel, and current featured store products.',
}

export default async function ShopPage() {
  const products = await listStoreProducts()

  return <ShopCatalogClient products={products} />
}
