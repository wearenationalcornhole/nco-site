import type { BagColorCmyk, BagDesignJson, BagMakerFontFamily, BagMakerLayout } from '@/app/lib/bagMakerTypes'

export const BAG_ART_SIZE_INCHES = 7.5
export const BAG_ART_DPI = 300
export const BAG_ART_SIZE_PX = 2250
export const MAIN_PLACEMENT_SIZE_INCHES = 4
export const MAIN_PLACEMENT_SIZE_PX = 1200
export const PROOF_WIDTH_PX = 1600
export const PROOF_HEIGHT_PX = 1000

export const BAG_MAKER_PUBLIC_NCO_LOGO_PATH = '/images/bag-maker/nco-logo.png'
export const BAG_MAKER_FALLBACK_NCO_LOGO_PATH = '/images/nco-mark.png'
export const BAG_MAKER_PREVIEW_OVERLAY_PATH = '/images/bag-maker/bag-template-overlay.png'
export const BAG_MAKER_PREVIEW_MASK_PATH = '/images/bag-maker/bag-shape-mask.png'

export const DEFAULT_CUSTOM_BAG_PRICE_CENTS = 8500
export const CUSTOM_BAG_CART_SLUG = 'custom-bag-set'

export const MAIN_PLACEMENT_ZONE = {
  x: Math.round((BAG_ART_SIZE_PX - MAIN_PLACEMENT_SIZE_PX) / 2),
  y: 525,
  width: MAIN_PLACEMENT_SIZE_PX,
  height: MAIN_PLACEMENT_SIZE_PX,
}

export const ORGANIZER_LOGO_ZONE = {
  x: MAIN_PLACEMENT_ZONE.x - 225,
  y: MAIN_PLACEMENT_ZONE.y - 225,
  width: 300,
  height: 300,
}

export const LOCKED_NCO_LOGO_ZONE = {
  x: 1650,
  y: 1650,
  width: 300,
  height: 300,
}

export const BAG_PREVIEW_RADIUS_PX = 300

export const BAG_MAKER_LAYOUT_OPTIONS: Array<{ value: BagMakerLayout; label: string }> = [
  { value: 'center_logo', label: 'Center logo only' },
  { value: 'logo_with_title_below', label: 'Logo with title below' },
  { value: 'title_above_logo', label: 'Title above logo' },
  { value: 'text_only', label: 'Text only' },
  { value: 'sponsor_layout', label: 'Sponsor/title sponsor layout' },
]

export const BAG_MAKER_FONT_OPTIONS: Array<{ value: BagMakerFontFamily; label: string }> = [
  { value: 'Inter', label: 'Inter / Sans' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Oswald', label: 'Oswald / Condensed' },
]

export const DEFAULT_BAG_COLOR_CMYK: BagColorCmyk = {
  c: 0,
  m: 0,
  y: 0,
  k: 0,
}

export function createDefaultBagDesignJson(): BagDesignJson {
  return {
    version: 1,
    bagColorHex: '#ffffff',
    bagColorCmyk: { ...DEFAULT_BAG_COLOR_CMYK },
    organizerLogoAssetId: null,
    slowSide: {
      layout: 'center_logo',
      mainAssetId: null,
      mainArtScale: 1,
      mainArtOffsetX: 0,
      mainArtOffsetY: 0,
      mainText: '',
      secondaryText: '',
      fontFamily: 'Inter',
      textColor: '#111111',
      showOrganizerLogo: true,
      showNcoLogo: true,
    },
    fastSide: {
      layout: 'center_logo',
      mainAssetId: null,
      mainArtScale: 1,
      mainArtOffsetX: 0,
      mainArtOffsetY: 0,
      mainText: '',
      secondaryText: '',
      fontFamily: 'Inter',
      textColor: '#111111',
      showOrganizerLogo: true,
      showNcoLogo: false,
    },
  }
}

export function getCustomBagPriceCents() {
  const rawValue =
    process.env.NCO_CUSTOM_BAG_PRICE_CENTS ??
    process.env.NEXT_PUBLIC_NCO_CUSTOM_BAG_PRICE_CENTS

  const parsed = Number(rawValue)
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed)
  }

  return DEFAULT_CUSTOM_BAG_PRICE_CENTS
}
