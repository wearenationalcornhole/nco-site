import type { ReactNode } from 'react'
import { ShopCartProvider } from './ShopCartProvider'
import CartDrawer from './CartDrawer'

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <ShopCartProvider>
      {children}
      <CartDrawer />
    </ShopCartProvider>
  )
}
