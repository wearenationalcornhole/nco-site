import type { ReactNode } from 'react'
import { listStoreProducts } from '@/app/lib/store/catalog'
import { ShopCartProvider } from './ShopCartProvider'
import CartDrawer from './CartDrawer'

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const products = await listStoreProducts()

  return (
    <ShopCartProvider products={products}>
      {children}
      <CartDrawer />
    </ShopCartProvider>
  )
}
