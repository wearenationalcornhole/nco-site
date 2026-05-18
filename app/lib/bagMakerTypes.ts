export type BagDesignStatus = 'draft' | 'rendered' | 'added_to_cart' | 'ordered' | 'archived'

export type BagDesignAssetType =
  | 'main_art_slow'
  | 'main_art_fast'
  | 'organizer_logo'
  | 'sponsor_logo'
  | 'event_logo'
  | 'proof'
  | 'production_art'

export type BagMakerLayout =
  | 'center_logo'
  | 'logo_with_title_below'
  | 'title_above_logo'
  | 'text_only'
  | 'sponsor_layout'

export type BagMakerFontFamily = 'Inter' | 'Arial' | 'Georgia' | 'Oswald'

export type BagColorCmyk = {
  c: number
  m: number
  y: number
  k: number
}

export type BagSideDesign = {
  layout: BagMakerLayout
  mainAssetId: string | null
  mainText: string
  secondaryText: string
  fontFamily: BagMakerFontFamily
  textColor: string
}

export type BagDesignJson = {
  version: 1
  bagColorHex: string
  bagColorCmyk: BagColorCmyk
  organizerLogoAssetId: string | null
  showOrganizerLogo: boolean
  slowSide: BagSideDesign
  fastSide: BagSideDesign
}

export type BagDesignRecord = {
  id: string
  profile_id: string
  event_id: string | null
  club_id: string | null
  status: BagDesignStatus
  bag_color_hex: string
  bag_color_cmyk: BagColorCmyk | null
  slow_side_art_url: string | null
  fast_side_art_url: string | null
  proof_url: string | null
  design_json: BagDesignJson
  cart_item_id: string | null
  order_id: string | null
  created_at: string
  updated_at: string
}

export type BagDesignAssetRecord = {
  id: string
  bag_design_id: string
  asset_type: BagDesignAssetType
  file_url: string
  storage_path: string | null
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  width_px: number | null
  height_px: number | null
  created_at: string
}

export type BagDesignWithAssets = BagDesignRecord & {
  assets: BagDesignAssetRecord[]
}

export type BagMakerAssetSlot = 'slow_main' | 'fast_main' | 'organizer_logo'

export type ManagedBagMakerOption = {
  id: string
  label: string
}

