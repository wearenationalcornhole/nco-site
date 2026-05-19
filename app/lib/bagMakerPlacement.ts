import { MAIN_PLACEMENT_SIZE_PX } from '@/app/lib/bagMakerConfig'
import type { BagMakerLayout } from '@/app/lib/bagMakerTypes'

export const DEFAULT_MAIN_ART_SCALE = 1
export const MAIN_ART_SCALE_MIN = 0.5
export const MAIN_ART_SCALE_MAX = 1.6

type MainArtLayoutSpec = {
  maxWidth: number
  maxHeight: number
  defaultTop: number
}

type MainArtPlacementInput = {
  layout: BagMakerLayout
  sourceWidth: number
  sourceHeight: number
  scale: number
  offsetX: number
  offsetY: number
}

type MainArtPlacementBox = {
  width: number
  height: number
  left: number
  top: number
  scale: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundFinite(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

export function normalizeMainArtScale(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_MAIN_ART_SCALE
  return clamp(parsed, MAIN_ART_SCALE_MIN, MAIN_ART_SCALE_MAX)
}

export function normalizeMainArtOffset(value: unknown) {
  return roundFinite(value, 0)
}

export function getMainArtLayoutSpec(layout: BagMakerLayout): MainArtLayoutSpec {
  return {
    maxWidth: 900,
    maxHeight:
      layout === 'logo_with_title_below'
        ? 700
        : layout === 'title_above_logo'
          ? 760
          : layout === 'sponsor_layout'
            ? 620
            : 860,
    defaultTop:
      layout === 'center_logo'
        ? 180
        : layout === 'logo_with_title_below'
          ? 150
          : layout === 'title_above_logo'
            ? 340
            : layout === 'sponsor_layout'
              ? 280
              : 250,
  }
}

function fitInsideBox(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!(width > 0) || !(height > 0)) {
    return { width: maxWidth, height: maxHeight }
  }

  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function getMainArtPlacementBox(input: MainArtPlacementInput): MainArtPlacementBox {
  const spec = getMainArtLayoutSpec(input.layout)
  const baseSize = fitInsideBox(input.sourceWidth, input.sourceHeight, spec.maxWidth, spec.maxHeight)
  const scale = normalizeMainArtScale(input.scale)
  const maxOriginalScale = Math.min(
    input.sourceWidth / Math.max(baseSize.width, 1),
    input.sourceHeight / Math.max(baseSize.height, 1),
  )
  const maxPlacementScale = Math.min(
    MAIN_PLACEMENT_SIZE_PX / baseSize.width,
    MAIN_PLACEMENT_SIZE_PX / baseSize.height,
    Number.isFinite(maxOriginalScale) && maxOriginalScale > 0 ? maxOriginalScale : MAIN_ART_SCALE_MAX,
    MAIN_ART_SCALE_MAX,
  )
  const effectiveScale = clamp(scale, MAIN_ART_SCALE_MIN, maxPlacementScale)
  const width = Math.max(1, Math.round(baseSize.width * effectiveScale))
  const height = Math.max(1, Math.round(baseSize.height * effectiveScale))
  const centeredLeft = Math.round((MAIN_PLACEMENT_SIZE_PX - width) / 2)
  const centeredTop = Math.round(spec.defaultTop + baseSize.height / 2 - height / 2)
  const maxLeft = Math.max(0, MAIN_PLACEMENT_SIZE_PX - width)
  const maxTop = Math.max(0, MAIN_PLACEMENT_SIZE_PX - height)

  return {
    width,
    height,
    left: clamp(centeredLeft + normalizeMainArtOffset(input.offsetX), 0, maxLeft),
    top: clamp(centeredTop + normalizeMainArtOffset(input.offsetY), 0, maxTop),
    scale: effectiveScale,
  }
}
