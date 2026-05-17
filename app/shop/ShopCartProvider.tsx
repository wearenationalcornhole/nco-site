'use client'

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { type Product } from '@/app/lib/store/catalog'

type CartItem = {
  slug: string
  quantity: number
}

type CartEntry = {
  product: Product
  quantity: number
  lineTotal: number
}

type ShopCartContextValue = {
  items: CartItem[]
  entries: CartEntry[]
  itemCount: number
  subtotal: number
  isOpen: boolean
  addItem: (slug: string, quantity?: number) => void
  removeItem: (slug: string) => void
  setQuantity: (slug: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

const STORAGE_KEY = 'nco-shop-cart'
const ShopCartContext = createContext<ShopCartContextValue | null>(null)

export function ShopCartProvider({
  children,
  products,
}: {
  children: ReactNode
  products: Product[]
}) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as CartItem[]
      if (Array.isArray(parsed)) {
        setItems(
          parsed.filter(
            (item) =>
              typeof item.slug === 'string' &&
              typeof item.quantity === 'number' &&
              item.quantity > 0,
          ),
        )
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHasHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [hasHydrated, items])

  const entries = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((candidate) => candidate.slug === item.slug)
        if (!product) return null
        return {
          product,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        }
      })
      .filter((entry): entry is CartEntry => Boolean(entry))
  }, [items, products])

  const itemCount = useMemo(
    () => entries.reduce((total, entry) => total + entry.quantity, 0),
    [entries],
  )
  const subtotal = useMemo(
    () => entries.reduce((total, entry) => total + entry.lineTotal, 0),
    [entries],
  )

  const addItem = useCallback((slug: string, quantity = 1) => {
    if (quantity <= 0) return
    const product = products.find((candidate) => candidate.slug === slug)
    if (!product || product.inventoryStatus === 'sold_out') return

    setItems((current) => {
      const existing = current.find((item) => item.slug === slug)
      if (!existing) return [...current, { slug, quantity }]
      return current.map((item) =>
        item.slug === slug
          ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
          : item,
      )
    })
    setIsOpen(true)
  }, [products])

  const removeItem = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug))
  }, [])

  const setQuantity = useCallback((slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(slug)
      return
    }

    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: Math.min(10, quantity) } : item,
      ),
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const value = useMemo<ShopCartContextValue>(
    () => ({
      items,
      entries,
      itemCount,
      subtotal,
      isOpen,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [addItem, clearCart, entries, isOpen, itemCount, items, removeItem, setQuantity, subtotal],
  )

  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>
}

export function useShopCart() {
  const context = useContext(ShopCartContext)
  if (!context) {
    throw new Error('useShopCart must be used inside ShopCartProvider')
  }
  return context
}
