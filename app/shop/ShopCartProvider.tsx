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
import {
  addCatalogCartItem,
  getCartItemKey,
  normalizePersistedCartItems,
  readShopCart,
  resolveCartEntry,
  writeShopCart,
  type CustomBagCartItem,
  type PersistedCartItem,
  type ResolvedCartEntry,
} from '@/app/lib/shopCart'

type ShopCartContextValue = {
  items: PersistedCartItem[]
  entries: ResolvedCartEntry[]
  itemCount: number
  subtotal: number
  isOpen: boolean
  addItem: (slug: string, quantity?: number) => void
  addCustomBagItem: (item: CustomBagCartItem) => void
  removeItem: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

const ShopCartContext = createContext<ShopCartContextValue | null>(null)

export function ShopCartProvider({
  children,
  products,
}: {
  children: ReactNode
  products: Product[]
}) {
  const [items, setItems] = useState<PersistedCartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    try {
      setItems(readShopCart())
    } catch {
      writeShopCart([])
    } finally {
      setHasHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    writeShopCart(items)
  }, [hasHydrated, items])

  const entries = useMemo(
    () => items.map((item) => resolveCartEntry(item, products)).filter(Boolean) as ResolvedCartEntry[],
    [items, products],
  )

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

    setItems(addCatalogCartItem(slug, quantity))
    setIsOpen(true)
  }, [products])

  const addCustomBagItem = useCallback((item: CustomBagCartItem) => {
    setItems((current) => {
      const next = normalizePersistedCartItems(
        current.filter(
          (existing) => !(existing.kind === 'custom_bag' && existing.designId === item.designId),
        ),
      )
      next.push(item)
      return next
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => getCartItemKey(item) !== key))
  }, [])

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(key)
      return
    }

    setItems((current) =>
      current.map((item) =>
        getCartItemKey(item) === key ? { ...item, quantity: Math.min(10, quantity) } : item,
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
      addCustomBagItem,
      removeItem,
      setQuantity,
      clearCart,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [addCustomBagItem, addItem, clearCart, entries, isOpen, itemCount, items, removeItem, setQuantity, subtotal],
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
