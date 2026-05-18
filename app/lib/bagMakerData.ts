import { devStore } from '@/app/lib/devStore'
import { createDefaultBagDesignJson } from '@/app/lib/bagMakerConfig'
import { cmykToHex, normalizeBagColorCmyk, normalizeHexColor } from '@/app/lib/bagMakerColor'
import { canUseAdminTools } from '@/app/lib/profileCapabilities'
import {
  canManageClubAccess,
  canManageEvent,
  type RouteActor,
} from '@/app/lib/portalRouteAccess'
import type {
  BagColorCmyk,
  BagDesignAssetRecord,
  BagDesignAssetType,
  BagDesignJson,
  BagDesignRecord,
  BagDesignStatus,
  BagDesignWithAssets,
  BagMakerAssetSlot,
} from '@/app/lib/bagMakerTypes'

type BagDesignRow = Record<string, any>
type BagDesignAssetRow = Record<string, any>

type BagDesignCreateInput = {
  eventId?: string | null
  clubId?: string | null
}

type BagDesignUpdateInput = Partial<{
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
}>

type BagDesignAssetCreateInput = {
  bag_design_id: string
  asset_type: BagDesignAssetType
  file_url: string
  storage_path?: string | null
  original_filename?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  width_px?: number | null
  height_px?: number | null
}

function nowIso() {
  return new Date().toISOString()
}

function isMissingTableError(error: any) {
  const message = String(error?.message ?? '').toLowerCase()
  const code = String(error?.code ?? '').toLowerCase()
  return (
    code === '42p01' ||
    code === 'pgrst205' ||
    message.includes('bag_design') ||
    message.includes('does not exist') ||
    message.includes('could not find')
  )
}

export async function getSupabaseAdminSafe() {
  try {
    const mod = await import('@/app/lib/supabaseAdmin')
    return mod.supabaseAdmin
  } catch {
    return null
  }
}

function normalizeSide(value: any, fallback: BagDesignJson['slowSide']): BagDesignJson['slowSide'] {
  return {
    layout:
      value?.layout === 'logo_with_title_below' ||
      value?.layout === 'title_above_logo' ||
      value?.layout === 'text_only' ||
      value?.layout === 'sponsor_layout'
        ? value.layout
        : fallback.layout,
    mainAssetId: typeof value?.mainAssetId === 'string' ? value.mainAssetId : null,
    mainText: typeof value?.mainText === 'string' ? value.mainText : fallback.mainText,
    secondaryText:
      typeof value?.secondaryText === 'string' ? value.secondaryText : fallback.secondaryText,
    fontFamily:
      value?.fontFamily === 'Arial' ||
      value?.fontFamily === 'Georgia' ||
      value?.fontFamily === 'Oswald'
        ? value.fontFamily
        : fallback.fontFamily,
    textColor: normalizeHexColor(value?.textColor, fallback.textColor),
    showNcoLogo:
      typeof value?.showNcoLogo === 'boolean' ? value.showNcoLogo : fallback.showNcoLogo,
  }
}

function enforceNcoLogoPlacement(
  slowSide: BagDesignJson['slowSide'],
  fastSide: BagDesignJson['fastSide'],
) {
  if (slowSide.showNcoLogo || fastSide.showNcoLogo) {
    return { slowSide, fastSide }
  }

  return {
    slowSide: {
      ...slowSide,
      showNcoLogo: true,
    },
    fastSide: {
      ...fastSide,
      showNcoLogo: false,
    },
  }
}

function parseStorageBucketPath(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  const slashIndex = trimmed.indexOf('/')
  if (slashIndex <= 0) return null
  return {
    bucket: trimmed.slice(0, slashIndex),
    objectPath: trimmed.slice(slashIndex + 1),
  }
}

export async function createStorageAccessUrl(
  storagePath: string | null | undefined,
  fallbackUrl: string,
  expiresInSeconds = 60 * 60 * 24 * 7,
) {
  const parsed = parseStorageBucketPath(storagePath)
  const supabaseAdmin = await getSupabaseAdminSafe()

  if (parsed && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.objectPath, expiresInSeconds)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    const publicUrl = supabaseAdmin.storage.from(parsed.bucket).getPublicUrl(parsed.objectPath).data.publicUrl
    if (publicUrl) return publicUrl
  }

  return fallbackUrl
}

export function normalizeBagDesignJson(value: any, fallbackColor = '#ffffff'): BagDesignJson {
  const defaults = createDefaultBagDesignJson()
  const bagColorHex = normalizeHexColor(value?.bagColorHex, fallbackColor)
  const bagColorCmyk = normalizeBagColorCmyk(value?.bagColorCmyk)
  const slowSide = normalizeSide(value?.slowSide, defaults.slowSide)
  const fastSide = normalizeSide(value?.fastSide, defaults.fastSide)
  const enforcedSides = enforceNcoLogoPlacement(slowSide, fastSide)

  return {
    version: 1,
    bagColorHex,
    bagColorCmyk,
    organizerLogoAssetId:
      typeof value?.organizerLogoAssetId === 'string' ? value.organizerLogoAssetId : null,
    showOrganizerLogo:
      typeof value?.showOrganizerLogo === 'boolean'
        ? value.showOrganizerLogo
        : defaults.showOrganizerLogo,
    slowSide: enforcedSides.slowSide,
    fastSide: enforcedSides.fastSide,
  }
}

function normalizeBagDesignRecord(row: BagDesignRow): BagDesignRecord {
  const bagColorHex = normalizeHexColor(
    row.bag_color_hex,
    row.design_json?.bagColorHex ?? '#ffffff',
  )
  const bagColorCmyk = row.bag_color_cmyk
    ? normalizeBagColorCmyk(row.bag_color_cmyk)
    : normalizeBagColorCmyk(row.design_json?.bagColorCmyk)

  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    event_id: row.event_id ? String(row.event_id) : null,
    club_id: row.club_id ? String(row.club_id) : null,
    status:
      row.status === 'rendered' ||
      row.status === 'added_to_cart' ||
      row.status === 'ordered' ||
      row.status === 'archived'
        ? row.status
        : 'draft',
    bag_color_hex: bagColorHex,
    bag_color_cmyk: bagColorCmyk,
    slow_side_art_url: row.slow_side_art_url ? String(row.slow_side_art_url) : null,
    fast_side_art_url: row.fast_side_art_url ? String(row.fast_side_art_url) : null,
    proof_url: row.proof_url ? String(row.proof_url) : null,
    design_json: normalizeBagDesignJson(row.design_json, bagColorHex),
    cart_item_id: row.cart_item_id ? String(row.cart_item_id) : null,
    order_id: row.order_id ? String(row.order_id) : null,
    created_at: row.created_at ? String(row.created_at) : nowIso(),
    updated_at: row.updated_at ? String(row.updated_at) : nowIso(),
  }
}

function normalizeBagDesignAssetRecord(row: BagDesignAssetRow): BagDesignAssetRecord {
  return {
    id: String(row.id),
    bag_design_id: String(row.bag_design_id),
    asset_type: row.asset_type,
    file_url: String(row.file_url),
    storage_path: row.storage_path ? String(row.storage_path) : null,
    original_filename: row.original_filename ? String(row.original_filename) : null,
    mime_type: row.mime_type ? String(row.mime_type) : null,
    size_bytes: typeof row.size_bytes === 'number' ? row.size_bytes : null,
    width_px: typeof row.width_px === 'number' ? row.width_px : null,
    height_px: typeof row.height_px === 'number' ? row.height_px : null,
    created_at: row.created_at ? String(row.created_at) : nowIso(),
  }
}

async function resolveAssetUrls(assets: BagDesignAssetRecord[]) {
  return Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      file_url: await createStorageAccessUrl(asset.storage_path, asset.file_url),
    })),
  )
}

function getRenderedAssetUrl(assets: BagDesignAssetRecord[], filename: string, fallbackUrl: string | null) {
  const asset = assets.find((item) => item.original_filename === filename)
  return asset?.file_url ?? fallbackUrl
}

function toBagDesignWithAssets(record: BagDesignRecord, assets: BagDesignAssetRecord[]): BagDesignWithAssets {
  const scopedAssets = assets
    .filter((asset) => asset.bag_design_id === record.id)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))

  return {
    ...record,
    slow_side_art_url: getRenderedAssetUrl(scopedAssets, 'slow-side-production.png', record.slow_side_art_url),
    fast_side_art_url: getRenderedAssetUrl(scopedAssets, 'fast-side-production.png', record.fast_side_art_url),
    proof_url: getRenderedAssetUrl(scopedAssets, 'customer-proof.png', record.proof_url),
    assets: scopedAssets,
  }
}

async function validateBagDesignLinks(
  actor: RouteActor,
  input: { eventId?: string | null; clubId?: string | null },
) {
  if (input.eventId) {
    const allowed = await canManageEvent(actor, input.eventId)
    if (!allowed) throw new Error('You do not have access to link this design to that event.')
  }

  if (input.clubId) {
    const allowed = await canManageClubAccess(actor, input.clubId)
    if (!allowed) throw new Error('You do not have access to link this design to that club.')
  }
}

async function listSupabaseBagDesignsByIds(ids: string[]) {
  const supabaseAdmin = await getSupabaseAdminSafe()
  if (ids.length === 0) return []
  if (!supabaseAdmin) return null

  const [designsResult, assetsResult] = await Promise.all([
    supabaseAdmin.from('bag_designs').select('*').in('id', ids),
    supabaseAdmin.from('bag_design_assets').select('*').in('bag_design_id', ids),
  ])

  if (designsResult.error) {
    if (isMissingTableError(designsResult.error)) return null
    throw new Error(designsResult.error.message)
  }

  if (assetsResult.error) {
    if (isMissingTableError(assetsResult.error)) return null
    throw new Error(assetsResult.error.message)
  }

  const designs = (designsResult.data ?? []).map(normalizeBagDesignRecord)
  const assets = await resolveAssetUrls((assetsResult.data ?? []).map(normalizeBagDesignAssetRecord))
  return designs.map((design) => toBagDesignWithAssets(design, assets))
}

function listDevBagDesignsByIds(ids: string[]) {
  const idSet = new Set(ids)
  const designs = devStore
    .getAll<BagDesignRow>('bag_designs')
    .filter((row) => idSet.has(String(row.id)))
    .map(normalizeBagDesignRecord)
  const assets = devStore
    .getAll<BagDesignAssetRow>('bag_design_assets')
    .filter((row) => idSet.has(String(row.bag_design_id)))
    .map(normalizeBagDesignAssetRecord)

  return designs.map((design) => toBagDesignWithAssets(design, assets))
}

function getDevBagDesign(id: string) {
  const row = devStore.getById<BagDesignRow>('bag_designs', id)
  if (!row) return null
  const assets = devStore
    .getAll<BagDesignAssetRow>('bag_design_assets')
    .filter((asset) => String(asset.bag_design_id) === id)
    .map(normalizeBagDesignAssetRecord)
  return toBagDesignWithAssets(normalizeBagDesignRecord(row), assets)
}

async function getSupabaseBagDesign(id: string) {
  const results = await listSupabaseBagDesignsByIds([id])
  return results?.[0] ?? null
}

async function getBagDesignForActorInternal(actor: RouteActor, id: string) {
  const supabaseDesign = await getSupabaseBagDesign(id)
  const design = supabaseDesign ?? getDevBagDesign(id)

  if (!design) return null
  if (design.profile_id === actor.user.id || canUseAdminTools(actor.role)) return design
  return null
}

export async function listBagDesignsForActor(actor: RouteActor) {
  const supabaseAdmin = await getSupabaseAdminSafe()

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('bag_designs')
      .select('id')
      .eq('profile_id', actor.user.id)
      .order('updated_at', { ascending: false })

    if (!error) {
      const ids = (data ?? []).map((row) => String(row.id))
      const rows = await listSupabaseBagDesignsByIds(ids)
      if (rows) return rows
    } else if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  return listDevBagDesignsByIds(
    devStore
      .getAll<BagDesignRow>('bag_designs')
      .filter((row) => String(row.profile_id) === actor.user.id)
      .sort((left, right) =>
        String(right.updated_at ?? right.created_at ?? '').localeCompare(
          String(left.updated_at ?? left.created_at ?? ''),
        ),
      )
      .map((row) => String(row.id)),
  )
}

export async function getBagDesignForActor(actor: RouteActor, id: string) {
  return getBagDesignForActorInternal(actor, id)
}

export async function createBagDesign(actor: RouteActor, input: BagDesignCreateInput = {}) {
  await validateBagDesignLinks(actor, input)

  const createdAt = nowIso()
  const defaultDesign = createDefaultBagDesignJson()
  const row = {
    profile_id: actor.user.id,
    event_id: input.eventId ?? null,
    club_id: input.clubId ?? null,
    status: 'draft',
    bag_color_hex: defaultDesign.bagColorHex,
    bag_color_cmyk: defaultDesign.bagColorCmyk,
    slow_side_art_url: null,
    fast_side_art_url: null,
    proof_url: null,
    design_json: defaultDesign,
    cart_item_id: null,
    order_id: null,
    created_at: createdAt,
    updated_at: createdAt,
  }

  const supabaseAdmin = await getSupabaseAdminSafe()
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('bag_designs').insert(row).select('*').single()
    if (!error) {
      return toBagDesignWithAssets(normalizeBagDesignRecord(data), [])
    }
    if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  const created = devStore.upsert('bag_designs', row)
  return toBagDesignWithAssets(normalizeBagDesignRecord(created), [])
}

export async function updateBagDesign(
  actor: RouteActor,
  id: string,
  input: BagDesignUpdateInput,
) {
  const existing = await getBagDesignForActorInternal(actor, id)
  if (!existing) return null

  const eventId = input.event_id !== undefined ? input.event_id : existing.event_id
  const clubId = input.club_id !== undefined ? input.club_id : existing.club_id
  await validateBagDesignLinks(actor, { eventId, clubId })

  const nextColorHex = normalizeHexColor(
    input.bag_color_hex ??
      input.design_json?.bagColorHex ??
      existing.bag_color_hex,
    existing.bag_color_hex,
  )

  const nextColorCmyk =
    input.bag_color_cmyk === null
      ? normalizeBagColorCmyk(existing.bag_color_cmyk ?? existing.design_json.bagColorCmyk)
      : normalizeBagColorCmyk(
          input.bag_color_cmyk ?? input.design_json?.bagColorCmyk ?? existing.bag_color_cmyk,
        )

  const designJson = normalizeBagDesignJson(
    {
      ...existing.design_json,
      ...(input.design_json ?? {}),
      bagColorHex: nextColorHex,
      bagColorCmyk: nextColorCmyk,
    },
    nextColorHex,
  )

  const updateRow = {
    ...(input.event_id !== undefined ? { event_id: input.event_id } : {}),
    ...(input.club_id !== undefined ? { club_id: input.club_id } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.slow_side_art_url !== undefined ? { slow_side_art_url: input.slow_side_art_url } : {}),
    ...(input.fast_side_art_url !== undefined ? { fast_side_art_url: input.fast_side_art_url } : {}),
    ...(input.proof_url !== undefined ? { proof_url: input.proof_url } : {}),
    ...(input.cart_item_id !== undefined ? { cart_item_id: input.cart_item_id } : {}),
    ...(input.order_id !== undefined ? { order_id: input.order_id } : {}),
    bag_color_hex: nextColorHex,
    bag_color_cmyk: nextColorCmyk,
    design_json: designJson,
    updated_at: nowIso(),
  }

  const supabaseAdmin = await getSupabaseAdminSafe()
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('bag_designs')
      .update(updateRow)
      .eq('id', id)
      .select('*')
      .single()

    if (!error) {
      return toBagDesignWithAssets(normalizeBagDesignRecord(data), existing.assets)
    }

    if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  const updated = devStore.upsert('bag_designs', {
    ...existing,
    ...updateRow,
    id,
  })
  return toBagDesignWithAssets(normalizeBagDesignRecord(updated), existing.assets)
}

export async function archiveBagDesign(actor: RouteActor, id: string) {
  return updateBagDesign(actor, id, { status: 'archived' })
}

function nextDesignJsonForAsset(
  current: BagDesignJson,
  slot: BagMakerAssetSlot,
  assetId: string,
) {
  if (slot === 'slow_main') {
    return {
      ...current,
      slowSide: {
        ...current.slowSide,
        mainAssetId: assetId,
      },
    }
  }

  if (slot === 'fast_main') {
    return {
      ...current,
      fastSide: {
        ...current.fastSide,
        mainAssetId: assetId,
      },
    }
  }

  return {
    ...current,
    organizerLogoAssetId: assetId,
  }
}

export async function createBagDesignAsset(
  actor: RouteActor,
  designId: string,
  input: BagDesignAssetCreateInput,
  slot?: BagMakerAssetSlot,
) {
  const existing = await getBagDesignForActorInternal(actor, designId)
  if (!existing) return null

  const createdAt = nowIso()
  const row = {
    bag_design_id: designId,
    asset_type: input.asset_type,
    file_url: input.file_url,
    storage_path: input.storage_path ?? null,
    original_filename: input.original_filename ?? null,
    mime_type: input.mime_type ?? null,
    size_bytes: input.size_bytes ?? null,
    width_px: input.width_px ?? null,
    height_px: input.height_px ?? null,
    created_at: createdAt,
  }

  const supabaseAdmin = await getSupabaseAdminSafe()
  let createdAsset: BagDesignAssetRecord | null = null

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('bag_design_assets')
      .insert(row)
      .select('*')
      .single()

    if (!error) {
      createdAsset = normalizeBagDesignAssetRecord(data)
    } else if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  if (!createdAsset) {
    createdAsset = normalizeBagDesignAssetRecord(devStore.upsert('bag_design_assets', row))
  }

  let nextDesign = existing
  if (slot) {
    nextDesign =
      (await updateBagDesign(actor, designId, {
        design_json: nextDesignJsonForAsset(existing.design_json, slot, createdAsset.id),
      })) ?? existing
  }

  return toBagDesignWithAssets(nextDesign, [createdAsset, ...existing.assets])
}

export async function replaceRenderedArt(
  actor: RouteActor,
  designId: string,
  input: {
    slowSideArtUrl: string
    slowSideStoragePath?: string | null
    fastSideArtUrl: string
    fastSideStoragePath?: string | null
    proofUrl: string
    proofStoragePath?: string | null
  },
) {
  const existing = await getBagDesignForActorInternal(actor, designId)
  if (!existing) return null

  const supabaseAdmin = await getSupabaseAdminSafe()
  if (supabaseAdmin) {
    const { error: deleteError } = await supabaseAdmin
      .from('bag_design_assets')
      .delete()
      .eq('bag_design_id', designId)
      .in('asset_type', ['proof', 'production_art'])

    if (deleteError && !isMissingTableError(deleteError)) {
      throw new Error(deleteError.message)
    }
  } else {
    devStore
      .getAll<BagDesignAssetRow>('bag_design_assets')
      .filter(
        (row) =>
          String(row.bag_design_id) === designId &&
          (row.asset_type === 'proof' || row.asset_type === 'production_art'),
      )
      .forEach((row) => {
        if (row.id) devStore.remove('bag_design_assets', String(row.id))
      })
  }

  const updated =
    (await updateBagDesign(actor, designId, {
      status: 'rendered',
      slow_side_art_url: input.slowSideArtUrl,
      fast_side_art_url: input.fastSideArtUrl,
      proof_url: input.proofUrl,
    })) ?? existing

  const assetRows: BagDesignAssetCreateInput[] = [
    {
      bag_design_id: designId,
      asset_type: 'production_art',
      file_url: input.slowSideArtUrl,
      storage_path: input.slowSideStoragePath ?? null,
      original_filename: 'slow-side-production.png',
      mime_type: 'image/png',
    },
    {
      bag_design_id: designId,
      asset_type: 'production_art',
      file_url: input.fastSideArtUrl,
      storage_path: input.fastSideStoragePath ?? null,
      original_filename: 'fast-side-production.png',
      mime_type: 'image/png',
    },
    {
      bag_design_id: designId,
      asset_type: 'proof',
      file_url: input.proofUrl,
      storage_path: input.proofStoragePath ?? null,
      original_filename: 'customer-proof.png',
      mime_type: 'image/png',
    },
  ]

  const supabaseAdminAfterUpdate = await getSupabaseAdminSafe()
  const createdAssets: BagDesignAssetRecord[] = []

  if (supabaseAdminAfterUpdate) {
    const { data, error } = await supabaseAdminAfterUpdate
      .from('bag_design_assets')
      .insert(
        assetRows.map((row) => ({
          ...row,
          created_at: nowIso(),
        })),
      )
      .select('*')

    if (!error) {
      createdAssets.push(...(data ?? []).map(normalizeBagDesignAssetRecord))
    } else if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  if (createdAssets.length === 0) {
    createdAssets.push(
      ...assetRows.map((row) =>
        normalizeBagDesignAssetRecord(
          devStore.upsert('bag_design_assets', {
            ...row,
            created_at: nowIso(),
          }),
        ),
      ),
    )
  }

  const preservedAssets = existing.assets.filter(
    (asset) => asset.asset_type !== 'proof' && asset.asset_type !== 'production_art',
  )

  return toBagDesignWithAssets(updated, [...createdAssets, ...preservedAssets])
}

export async function setBagDesignAddedToCart(actor: RouteActor, designId: string, cartItemId: string) {
  return updateBagDesign(actor, designId, {
    status: 'added_to_cart',
    cart_item_id: cartItemId,
  })
}

export async function markBagDesignsOrdered(designIds: string[], orderId: string) {
  const uniqueIds = Array.from(new Set(designIds.filter(Boolean)))
  if (uniqueIds.length === 0) return

  const supabaseAdmin = await getSupabaseAdminSafe()
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('bag_designs')
      .update({
        status: 'ordered',
        order_id: orderId,
        updated_at: nowIso(),
      })
      .in('id', uniqueIds)

    if (!error) return
    if (!isMissingTableError(error)) {
      throw new Error(error.message)
    }
  }

  uniqueIds.forEach((id) => {
    const current = devStore.getById<BagDesignRow>('bag_designs', id)
    if (!current) return
    devStore.upsert('bag_designs', {
      ...current,
      status: 'ordered',
      order_id: orderId,
      updated_at: nowIso(),
    })
  })
}

export function resolveBagDesignAsset(
  design: BagDesignWithAssets,
  assetId: string | null | undefined,
) {
  if (!assetId) return null
  return design.assets.find((asset) => asset.id === assetId) ?? null
}

export function getAssetSlotType(slot: BagMakerAssetSlot): BagDesignAssetType {
  if (slot === 'slow_main') return 'main_art_slow'
  if (slot === 'fast_main') return 'main_art_fast'
  return 'organizer_logo'
}

export function mergeBagDesignColorFromCmyk(input: Partial<BagColorCmyk>) {
  const cmyk = normalizeBagColorCmyk(input)
  return {
    bagColorCmyk: cmyk,
    bagColorHex: cmykToHex(cmyk),
  }
}

export function sanitizeBagDesignForActor(actor: RouteActor, design: BagDesignWithAssets): BagDesignWithAssets {
  if (canUseAdminTools(actor.role)) {
    return design
  }

  return {
    ...design,
    slow_side_art_url: null,
    fast_side_art_url: null,
    assets: design.assets.filter((asset) => asset.asset_type !== 'production_art'),
  }
}

export function sanitizeBagDesignsForActor(actor: RouteActor, designs: BagDesignWithAssets[]) {
  return designs.map((design) => sanitizeBagDesignForActor(actor, design))
}
