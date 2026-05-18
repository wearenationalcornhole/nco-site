import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  BAG_ART_SIZE_PX,
  BAG_MAKER_FALLBACK_NCO_LOGO_PATH,
  BAG_MAKER_PUBLIC_NCO_LOGO_PATH,
  BAG_PREVIEW_RADIUS_PX,
  LOCKED_NCO_LOGO_ZONE,
  MAIN_PLACEMENT_ZONE,
  ORGANIZER_LOGO_ZONE,
  PROOF_HEIGHT_PX,
  PROOF_WIDTH_PX,
} from '@/app/lib/bagMakerConfig'
import { hexToRgb, normalizeHexColor } from '@/app/lib/bagMakerColor'
import { getSupabaseAdminSafe, resolveBagDesignAsset } from '@/app/lib/bagMakerData'
import type {
  BagDesignAssetRecord,
  BagDesignJson,
  BagDesignWithAssets,
  BagMakerFontFamily,
  BagSideDesign,
} from '@/app/lib/bagMakerTypes'

type AssetBufferResult = {
  buffer: Buffer
  mimeType: string
}

type RenderedBagArt = {
  slowSide: Buffer
  fastSide: Buffer
  proof: Buffer
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fontFamilyToSvg(value: BagMakerFontFamily) {
  switch (value) {
    case 'Georgia':
      return 'Georgia, serif'
    case 'Oswald':
      return '"Arial Narrow", "Arial Black", Arial, sans-serif'
    case 'Arial':
      return 'Arial, Helvetica, sans-serif'
    default:
      return 'Arial, Helvetica, sans-serif'
  }
}

function svgBuffer(width: number, height: number, markup: string) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markup}</svg>`,
  )
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readLocalAssetBuffer(relativePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''))
  if (!(await fileExists(absolutePath))) return null
  return fs.readFile(absolutePath)
}

async function loadLockedNcoLogoBuffer() {
  const preferred = await readLocalAssetBuffer(BAG_MAKER_PUBLIC_NCO_LOGO_PATH)
  if (preferred) return preferred
  const fallback = await readLocalAssetBuffer(BAG_MAKER_FALLBACK_NCO_LOGO_PATH)
  if (fallback) return fallback
  return null
}

function parseStorageBucketPath(value: string) {
  const slashIndex = value.indexOf('/')
  if (slashIndex <= 0) return null
  return {
    bucket: value.slice(0, slashIndex),
    objectPath: value.slice(slashIndex + 1),
  }
}

async function fetchRemoteBuffer(url: string): Promise<AssetBufferResult> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to fetch asset from ${url}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

export async function loadBagDesignAssetBuffer(asset: BagDesignAssetRecord): Promise<AssetBufferResult> {
  if (asset.storage_path) {
    const parsed = parseStorageBucketPath(asset.storage_path)
    const supabaseAdmin = await getSupabaseAdminSafe()

    if (parsed && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.storage
        .from(parsed.bucket)
        .download(parsed.objectPath)

      if (!error && data) {
        return {
          buffer: Buffer.from(await data.arrayBuffer()),
          mimeType: asset.mime_type ?? data.type ?? 'application/octet-stream',
        }
      }
    }
  }

  if (asset.file_url.startsWith('data:')) {
    const [, mime = 'application/octet-stream', encoded = ''] =
      asset.file_url.match(/^data:([^;]+);base64,(.+)$/) ?? []
    return {
      buffer: Buffer.from(encoded, 'base64'),
      mimeType: mime,
    }
  }

  return fetchRemoteBuffer(asset.file_url)
}

function buildTextSvg(
  side: BagSideDesign,
  width: number,
  height: number,
  options: {
    titleY: number
    subtitleY: number
    titleFontSize: number
    subtitleFontSize: number
    titleWeight?: number
  },
) {
  const lines: string[] = []
  const title = side.mainText.trim()
  const subtitle = side.secondaryText.trim()

  if (title) {
    lines.push(
      `<text x="50%" y="${options.titleY}" text-anchor="middle" dominant-baseline="middle" fill="${normalizeHexColor(
        side.textColor,
      )}" font-family="${fontFamilyToSvg(side.fontFamily)}" font-size="${options.titleFontSize}" font-weight="${options.titleWeight ?? 700}" letter-spacing="1.2">${escapeSvgText(
        title.toUpperCase(),
      )}</text>`,
    )
  }

  if (subtitle) {
    lines.push(
      `<text x="50%" y="${options.subtitleY}" text-anchor="middle" dominant-baseline="middle" fill="${normalizeHexColor(
        side.textColor,
      )}" font-family="${fontFamilyToSvg(side.fontFamily)}" font-size="${options.subtitleFontSize}" font-weight="500">${escapeSvgText(
        subtitle,
      )}</text>`,
    )
  }

  return lines.length > 0 ? svgBuffer(width, height, lines.join('')) : null
}

async function renderMainPlacement(
  design: BagDesignWithAssets,
  side: BagSideDesign,
): Promise<sharp.OverlayOptions[]> {
  const overlays: sharp.OverlayOptions[] = []
  const placementWidth = MAIN_PLACEMENT_ZONE.width
  const placementHeight = MAIN_PLACEMENT_ZONE.height
  const placementLeft = MAIN_PLACEMENT_ZONE.x
  const placementTop = MAIN_PLACEMENT_ZONE.y
  const mainAsset = resolveBagDesignAsset(design, side.mainAssetId)

  if (side.layout === 'text_only') {
    const text = buildTextSvg(side, placementWidth, placementHeight, {
      titleY: 520,
      subtitleY: 700,
      titleFontSize: 148,
      subtitleFontSize: 68,
      titleWeight: 800,
    })
    if (text) {
      overlays.push({ input: text, left: placementLeft, top: placementTop })
    }
    return overlays
  }

  if (side.layout === 'title_above_logo') {
    const text = buildTextSvg(side, placementWidth, placementHeight, {
      titleY: 180,
      subtitleY: 285,
      titleFontSize: 120,
      subtitleFontSize: 56,
      titleWeight: 800,
    })
    if (text) overlays.push({ input: text, left: placementLeft, top: placementTop })
  }

  if (mainAsset) {
    const assetBuffer = await loadBagDesignAssetBuffer(mainAsset)
    const assetHeightLimit =
      side.layout === 'logo_with_title_below'
        ? 700
        : side.layout === 'title_above_logo'
          ? 760
          : side.layout === 'sponsor_layout'
            ? 620
            : 860
    const rendered = await sharp(assetBuffer.buffer)
      .resize({
        width: 900,
        height: assetHeightLimit,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer()

    let assetTop = 250
    if (side.layout === 'center_logo') assetTop = 180
    if (side.layout === 'logo_with_title_below') assetTop = 150
    if (side.layout === 'title_above_logo') assetTop = 340
    if (side.layout === 'sponsor_layout') assetTop = 280

    overlays.push({
      input: rendered,
      left: placementLeft + 150,
      top: placementTop + assetTop,
    })
  }

  if (side.layout === 'logo_with_title_below') {
    const text = buildTextSvg(side, placementWidth, placementHeight, {
      titleY: 930,
      subtitleY: 1035,
      titleFontSize: 100,
      subtitleFontSize: 52,
      titleWeight: 800,
    })
    if (text) overlays.push({ input: text, left: placementLeft, top: placementTop })
  }

  if (side.layout === 'sponsor_layout') {
    const text = buildTextSvg(side, placementWidth, placementHeight, {
      titleY: 150,
      subtitleY: 930,
      titleFontSize: 90,
      subtitleFontSize: 64,
      titleWeight: 800,
    })
    if (text) overlays.push({ input: text, left: placementLeft, top: placementTop })
  }

  if (side.layout === 'center_logo' && !mainAsset) {
    const text = buildTextSvg(side, placementWidth, placementHeight, {
      titleY: 520,
      subtitleY: 700,
      titleFontSize: 136,
      subtitleFontSize: 60,
      titleWeight: 800,
    })
    if (text) overlays.push({ input: text, left: placementLeft, top: placementTop })
  }

  return overlays
}

async function renderOrganizerLogo(
  design: BagDesignWithAssets,
  designJson: BagDesignJson,
) {
  if (!designJson.showOrganizerLogo) return null
  const organizerLogo = resolveBagDesignAsset(design, designJson.organizerLogoAssetId)
  if (!organizerLogo) return null

  const assetBuffer = await loadBagDesignAssetBuffer(organizerLogo)
  return sharp(assetBuffer.buffer)
    .resize({
      width: ORGANIZER_LOGO_ZONE.width,
      height: ORGANIZER_LOGO_ZONE.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer()
}

async function renderLockedLogo() {
  const buffer = await loadLockedNcoLogoBuffer()
  if (!buffer) return null
  return sharp(buffer)
    .resize({
      width: LOCKED_NCO_LOGO_ZONE.width,
      height: LOCKED_NCO_LOGO_ZONE.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer()
}

async function renderSideArt(
  design: BagDesignWithAssets,
  side: BagSideDesign,
  designJson: BagDesignJson,
) {
  const background = hexToRgb(normalizeHexColor(designJson.bagColorHex))
  const base = sharp({
    create: {
      width: BAG_ART_SIZE_PX,
      height: BAG_ART_SIZE_PX,
      channels: 4,
      background: {
        r: background.r,
        g: background.g,
        b: background.b,
        alpha: 1,
      },
    },
  })

  const overlays = await renderMainPlacement(design, side)
  const organizerLogo = await renderOrganizerLogo(design, designJson)
  if (organizerLogo) {
    overlays.push({
      input: organizerLogo,
      left: ORGANIZER_LOGO_ZONE.x,
      top: ORGANIZER_LOGO_ZONE.y,
    })
  }

  const lockedLogo = await renderLockedLogo()
  if (lockedLogo) {
    overlays.push({
      input: lockedLogo,
      left: LOCKED_NCO_LOGO_ZONE.x,
      top: LOCKED_NCO_LOGO_ZONE.y,
    })
  }

  return base.composite(overlays).png().toBuffer()
}

function buildProofFrameSvg(width: number, height: number) {
  return svgBuffer(
    width,
    height,
    [
      `<defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.18"/></filter></defs>`,
      `<rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="${BAG_PREVIEW_RADIUS_PX / 2}" ry="${BAG_PREVIEW_RADIUS_PX / 2}" fill="white" filter="url(#shadow)"/>`,
      `<rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="${BAG_PREVIEW_RADIUS_PX / 2}" ry="${BAG_PREVIEW_RADIUS_PX / 2}" fill="none" stroke="#cbd5e1" stroke-width="6"/>`,
    ].join(''),
  )
}

function buildProofMaskSvg(width: number, height: number) {
  return svgBuffer(
    width,
    height,
    `<rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="${BAG_PREVIEW_RADIUS_PX / 2}" ry="${BAG_PREVIEW_RADIUS_PX / 2}" fill="white"/>`,
  )
}

async function makeProofBag(buffer: Buffer, width: number, height: number) {
  const resized = await sharp(buffer).resize(width, height, { fit: 'cover' }).png().toBuffer()
  const masked = await sharp(resized)
    .composite([{ input: buildProofMaskSvg(width, height), blend: 'dest-in' }])
    .png()
    .toBuffer()

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: buildProofFrameSvg(width, height), left: 0, top: 0 },
      { input: masked, left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
}

async function renderProof(
  design: BagDesignWithAssets,
  designJson: BagDesignJson,
  slowSideBuffer: Buffer,
  fastSideBuffer: Buffer,
) {
  const base = sharp({
    create: {
      width: PROOF_WIDTH_PX,
      height: PROOF_HEIGHT_PX,
      channels: 4,
      background: { r: 241, g: 245, b: 249, alpha: 1 },
    },
  })

  const bagWidth = 520
  const bagHeight = 520
  const leftX = 150
  const rightX = PROOF_WIDTH_PX - bagWidth - 150
  const bagY = 160
  const slowBag = await makeProofBag(slowSideBuffer, bagWidth, bagHeight)
  const fastBag = await makeProofBag(fastSideBuffer, bagWidth, bagHeight)

  const overlays: sharp.OverlayOptions[] = [
    { input: slowBag, left: leftX, top: bagY },
    { input: fastBag, left: rightX, top: bagY },
    {
      input: svgBuffer(
        PROOF_WIDTH_PX,
        PROOF_HEIGHT_PX,
        [
          `<text x="${leftX + bagWidth / 2}" y="760" text-anchor="middle" fill="#0f172a" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="700">Slow Side</text>`,
          `<text x="${rightX + bagWidth / 2}" y="760" text-anchor="middle" fill="#0f172a" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="700">Fast Side</text>`,
        ].join(''),
      ),
      left: 0,
      top: 0,
    },
  ]

  const organizerLogo = await renderOrganizerLogo(design, designJson)
  if (organizerLogo) {
    const proofLogo = await sharp(organizerLogo)
      .resize({
        width: 220,
        height: 120,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer()

    overlays.push({
      input: proofLogo,
      left: Math.round((PROOF_WIDTH_PX - 220) / 2),
      top: 820,
    })
  }

  return base.composite(overlays).png().toBuffer()
}

export async function renderBagDesignBuffers(design: BagDesignWithAssets): Promise<RenderedBagArt> {
  const designJson = {
    ...design.design_json,
    bagColorHex: normalizeHexColor(design.design_json.bagColorHex, design.bag_color_hex),
  }

  const slowSide = await renderSideArt(design, designJson.slowSide, designJson)
  const fastSide = await renderSideArt(design, designJson.fastSide, designJson)
  const proof = await renderProof(design, designJson, slowSide, fastSide)

  return { slowSide, fastSide, proof }
}
