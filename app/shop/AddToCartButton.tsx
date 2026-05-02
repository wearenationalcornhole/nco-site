'use client'

import { useState } from 'react'
import { useShopCart } from './ShopCartProvider'
import { type InventoryStatus, getInventoryLabel } from '@/app/lib/store/catalog'

export default function AddToCartButton({
  slug,
  inventoryStatus,
  quantity = 1,
  className = '',
}: {
  slug: string
  inventoryStatus: InventoryStatus
  quantity?: number
  className?: string
}) {
  const { addItem } = useShopCart()
  const [justAdded, setJustAdded] = useState(false)

  const disabled = inventoryStatus === 'sold_out'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        addItem(slug, quantity)
        setJustAdded(true)
        window.setTimeout(() => setJustAdded(false), 1600)
      }}
      className={`inline-flex items-center justify-center rounded-full bg-[#B31942] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
    >
      {disabled ? getInventoryLabel(inventoryStatus) : justAdded ? 'Added to Cart' : 'Add to Cart'}
    </button>
  )
}
