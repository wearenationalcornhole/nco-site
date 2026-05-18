import { DEFAULT_BAG_COLOR_CMYK } from '@/app/lib/bagMakerConfig'
import type { BagColorCmyk } from '@/app/lib/bagMakerTypes'

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizeHexColor(value: string | null | undefined, fallback = '#ffffff') {
  const trimmed = String(value ?? '').trim()
  const candidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return candidate.toLowerCase()
  }
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const [, r, g, b] = candidate
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback.toLowerCase()
}

export function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value)
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

export function rgbToHex(input: { r: number; g: number; b: number }) {
  const parts = [input.r, input.g, input.b].map((channel) =>
    clampChannel(channel).toString(16).padStart(2, '0'),
  )
  return `#${parts.join('')}`
}

export function cmykToHex(input: Partial<BagColorCmyk> | null | undefined) {
  const c = clampPercent(Number(input?.c ?? DEFAULT_BAG_COLOR_CMYK.c)) / 100
  const m = clampPercent(Number(input?.m ?? DEFAULT_BAG_COLOR_CMYK.m)) / 100
  const y = clampPercent(Number(input?.y ?? DEFAULT_BAG_COLOR_CMYK.y)) / 100
  const k = clampPercent(Number(input?.k ?? DEFAULT_BAG_COLOR_CMYK.k)) / 100

  const r = 255 * (1 - c) * (1 - k)
  const g = 255 * (1 - m) * (1 - k)
  const b = 255 * (1 - y) * (1 - k)

  return rgbToHex({ r, g, b })
}

export function hexToCmyk(value: string): BagColorCmyk {
  const { r, g, b } = hexToRgb(value)
  const rPrime = r / 255
  const gPrime = g / 255
  const bPrime = b / 255
  const k = 1 - Math.max(rPrime, gPrime, bPrime)

  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  const c = ((1 - rPrime - k) / (1 - k)) * 100
  const m = ((1 - gPrime - k) / (1 - k)) * 100
  const y = ((1 - bPrime - k) / (1 - k)) * 100

  return {
    c: clampPercent(c),
    m: clampPercent(m),
    y: clampPercent(y),
    k: clampPercent(k * 100),
  }
}

export function normalizeBagColorCmyk(value: Partial<BagColorCmyk> | null | undefined): BagColorCmyk {
  return {
    c: clampPercent(Number(value?.c ?? DEFAULT_BAG_COLOR_CMYK.c)),
    m: clampPercent(Number(value?.m ?? DEFAULT_BAG_COLOR_CMYK.m)),
    y: clampPercent(Number(value?.y ?? DEFAULT_BAG_COLOR_CMYK.y)),
    k: clampPercent(Number(value?.k ?? DEFAULT_BAG_COLOR_CMYK.k)),
  }
}

