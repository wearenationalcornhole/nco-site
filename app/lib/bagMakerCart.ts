import { CUSTOM_BAG_CART_SLUG, getCustomBagPriceCents } from '@/app/lib/bagMakerConfig'
import type { CustomBagCartItem } from '@/app/lib/shopCart'
import type { BagDesignWithAssets } from '@/app/lib/bagMakerTypes'

export function buildCustomBagCartItem(design: BagDesignWithAssets): CustomBagCartItem {
  if (!design.slow_side_art_url || !design.fast_side_art_url || !design.proof_url) {
    throw new Error('Generate bag art before adding this design to the cart.')
  }

  return {
    kind: 'custom_bag',
    slug: CUSTOM_BAG_CART_SLUG,
    quantity: 1,
    designId: design.id,
    title: 'NCO Custom Bag Set',
    category: 'Custom Bags',
    description: 'Organizer-approved custom bag set with slow side, fast side, and proof artwork.',
    image: design.proof_url,
    unitPrice: getCustomBagPriceCents(),
    bagColorHex: design.bag_color_hex,
    proofUrl: design.proof_url,
  }
}
