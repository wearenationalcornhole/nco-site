'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import Toast from '@/components/ui/Toast'
import {
  BAG_MAKER_FONT_OPTIONS,
  BAG_MAKER_LAYOUT_OPTIONS,
  BAG_MAKER_PUBLIC_NCO_LOGO_PATH,
  BAG_MAKER_FALLBACK_NCO_LOGO_PATH,
  MAIN_PLACEMENT_SIZE_PX,
  createDefaultBagDesignJson,
} from '@/app/lib/bagMakerConfig'
import { cmykToHex, hexToCmyk, normalizeBagColorCmyk, normalizeHexColor } from '@/app/lib/bagMakerColor'
import { getMainArtPlacementBox, MAIN_ART_SCALE_MAX, MAIN_ART_SCALE_MIN } from '@/app/lib/bagMakerPlacement'
import { formatPrice } from '@/app/lib/store/catalog'
import { upsertCustomBagCartItem } from '@/app/lib/shopCart'
import type {
  BagDesignAssetRecord,
  BagDesignJson,
  BagDesignWithAssets,
  ManagedBagMakerOption,
} from '@/app/lib/bagMakerTypes'
import type { ProfileRole } from '@/app/lib/profileCapabilities'

type ToastState = {
  kind: 'success' | 'error'
  message: string
} | null

type SideKey = 'slowSide' | 'fastSide'

type DesignListResponse = {
  items: BagDesignWithAssets[]
}

type ClubsResponse = {
  items: Array<{ clubId: string; club: { name: string } }>
}

type EventsResponse = {
  events: Array<{ id: string; title: string }>
}

function syncSignature(design: BagDesignWithAssets | null) {
  if (!design) return ''
  return JSON.stringify({
    event_id: design.event_id,
    club_id: design.club_id,
    bag_color_hex: design.design_json.bagColorHex,
    bag_color_cmyk: design.design_json.bagColorCmyk,
    design_json: design.design_json,
  })
}

function assetById(design: BagDesignWithAssets | null, assetId: string | null | undefined) {
  if (!design || !assetId) return null
  return design.assets.find((asset) => asset.id === assetId) ?? null
}

function sideLabel(side: SideKey) {
  return side === 'slowSide' ? 'Slow Side' : 'Fast Side'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function BagMakerClient({
  role,
  bagPriceCents,
}: {
  role: ProfileRole
  bagPriceCents: number
}) {
  const [designs, setDesigns] = useState<BagDesignWithAssets[]>([])
  const [design, setDesign] = useState<BagDesignWithAssets | null>(null)
  const [activeSide, setActiveSide] = useState<SideKey>('slowSide')
  const [managedEvents, setManagedEvents] = useState<ManagedBagMakerOption[]>([])
  const [managedClubs, setManagedClubs] = useState<ManagedBagMakerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [cartReady, setCartReady] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [lastSavedSignature, setLastSavedSignature] = useState('')

  const selectedSide = design?.design_json[activeSide] ?? createDefaultBagDesignJson()[activeSide]
  const organizerLogo = assetById(design, design?.design_json.organizerLogoAssetId)
  const sideMainAsset = assetById(design, selectedSide.mainAssetId)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [designsRes, clubsRes, eventsRes] = await Promise.all([
          fetch('/portal/api/bag-designs', { cache: 'no-store' }),
          fetch('/portal/api/clubs/managed', { cache: 'no-store' }),
          fetch('/portal/api/events?managedOnly=1&pageSize=50', { cache: 'no-store' }),
        ])

        const designsJson = designsRes.ok
          ? ((await designsRes.json()) as DesignListResponse)
          : { items: [] }
        const clubsJson = clubsRes.ok
          ? ((await clubsRes.json()) as ClubsResponse)
          : { items: [] }
        const eventsJson = eventsRes.ok
          ? ((await eventsRes.json()) as EventsResponse)
          : { events: [] }

        if (!alive) return

        const nextDesigns = Array.isArray(designsJson.items) ? designsJson.items : []
        setDesigns(nextDesigns)
        setManagedClubs(
          (clubsJson.items ?? []).map((item) => ({
            id: item.clubId,
            label: item.club?.name ?? 'Unnamed club',
          })),
        )
        setManagedEvents(
          (eventsJson.events ?? []).map((item) => ({
            id: item.id,
            label: item.title,
          })),
        )

        const latestDesign = nextDesigns[0] ?? null
        setDesign(latestDesign)
        setLastSavedSignature(syncSignature(latestDesign))
      } catch (error: any) {
        if (!alive) return
        setToast({
          kind: 'error',
          message: error?.message ?? 'Unable to load the bag maker.',
        })
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!design) return
    const signature = syncSignature(design)
    if (!signature || signature === lastSavedSignature) return

    const timeout = window.setTimeout(async () => {
      try {
        setSaving(true)
        const response = await fetch(`/portal/api/bag-designs/${design.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: design.event_id,
            clubId: design.club_id,
            bagColorHex: design.design_json.bagColorHex,
            bagColorCmyk: design.design_json.bagColorCmyk,
            designJson: design.design_json,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to save bag design.')
        }

        setDesign(payload)
        setDesigns((current) =>
          [payload as BagDesignWithAssets, ...current.filter((item) => item.id !== payload.id)].sort((left, right) =>
            right.updated_at.localeCompare(left.updated_at),
          ),
        )
        setLastSavedSignature(syncSignature(payload))
      } catch (error: any) {
        setToast({
          kind: 'error',
          message: error?.message ?? 'Unable to save bag maker changes.',
        })
      } finally {
        setSaving(false)
      }
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [design, lastSavedSignature])

  const mainArtWarning = useMemo(() => {
    if (!sideMainAsset) return null
    if ((sideMainAsset.width_px ?? 0) < 1200 || (sideMainAsset.height_px ?? 0) < 1200) {
      return 'Main artwork is below the recommended 1200px size and may print soft.'
    }
    return null
  }, [sideMainAsset])

  const organizerLogoWarning = useMemo(() => {
    if (!organizerLogo) return null
    if ((organizerLogo.width_px ?? 0) < 400) {
      return 'Organizer logo is below the recommended 400px width.'
    }
    return null
  }, [organizerLogo])

  async function createDraft() {
    try {
      const response = await fetch('/portal/api/bag-designs', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to create a new design.')
      setDesign(payload)
      setDesigns((current) => [payload as BagDesignWithAssets, ...current.filter((item) => item.id !== payload.id)])
      setLastSavedSignature(syncSignature(payload))
      setApprovalChecked(false)
      setCartReady(false)
    } catch (error: any) {
      setToast({ kind: 'error', message: error?.message ?? 'Unable to create a new draft.' })
    }
  }

  function updateDesignJson(nextJson: BagDesignJson) {
    setApprovalChecked(false)
    setCartReady(false)
    setDesign((current) =>
      current
        ? {
            ...current,
            bag_color_hex: nextJson.bagColorHex,
            bag_color_cmyk: nextJson.bagColorCmyk,
            design_json: nextJson,
          }
        : current,
    )
  }

  function updateSideByKey(sideKey: SideKey, nextSide: BagDesignJson['slowSide']) {
    if (!design) return
    updateDesignJson({
      ...design.design_json,
      [sideKey]: nextSide,
    })
  }

  function updateSide<K extends keyof BagDesignJson['slowSide']>(field: K, value: BagDesignJson['slowSide'][K]) {
    if (!design) return
    updateSideByKey(activeSide, {
      ...design.design_json[activeSide],
      [field]: value,
    })
  }

  function toggleNcoLogoSide(side: SideKey, checked: boolean) {
    if (!design) return

    const slowEnabled =
      side === 'slowSide' ? checked : design.design_json.slowSide.showNcoLogo
    const fastEnabled =
      side === 'fastSide' ? checked : design.design_json.fastSide.showNcoLogo

    updateDesignJson({
      ...design.design_json,
      slowSide: {
        ...design.design_json.slowSide,
        showNcoLogo: slowEnabled || !slowEnabled && !fastEnabled,
      },
      fastSide: {
        ...design.design_json.fastSide,
        showNcoLogo: fastEnabled,
      },
    })
  }

  function toggleOrganizerLogoSide(side: SideKey, checked: boolean) {
    if (!design) return

    updateDesignJson({
      ...design.design_json,
      slowSide: {
        ...design.design_json.slowSide,
        showOrganizerLogo: side === 'slowSide' ? checked : design.design_json.slowSide.showOrganizerLogo,
      },
      fastSide: {
        ...design.design_json.fastSide,
        showOrganizerLogo: side === 'fastSide' ? checked : design.design_json.fastSide.showOrganizerLogo,
      },
    })
  }

  function updateMainArtTransform(sideKey: SideKey, patch: Partial<Pick<BagDesignJson['slowSide'], 'mainArtScale' | 'mainArtOffsetX' | 'mainArtOffsetY'>>) {
    if (!design) return
    const currentSide = design.design_json[sideKey]
    updateSideByKey(sideKey, {
      ...currentSide,
      mainArtScale:
        typeof patch.mainArtScale === 'number'
          ? clamp(patch.mainArtScale, MAIN_ART_SCALE_MIN, MAIN_ART_SCALE_MAX)
          : currentSide.mainArtScale,
      mainArtOffsetX:
        typeof patch.mainArtOffsetX === 'number' ? Math.round(patch.mainArtOffsetX) : currentSide.mainArtOffsetX,
      mainArtOffsetY:
        typeof patch.mainArtOffsetY === 'number' ? Math.round(patch.mainArtOffsetY) : currentSide.mainArtOffsetY,
    })
  }

  function resetMainArtTransform(sideKey: SideKey) {
    updateMainArtTransform(sideKey, {
      mainArtScale: 1,
      mainArtOffsetX: 0,
      mainArtOffsetY: 0,
    })
  }

  function updateColorFromHex(nextHex: string) {
    if (!design) return
    const bagColorHex = normalizeHexColor(nextHex, design.design_json.bagColorHex)
    updateDesignJson({
      ...design.design_json,
      bagColorHex,
      bagColorCmyk: hexToCmyk(bagColorHex),
    })
  }

  function updateColorFromCmyk(field: 'c' | 'm' | 'y' | 'k', value: string) {
    if (!design) return
    const nextCmyk = normalizeBagColorCmyk({
      ...design.design_json.bagColorCmyk,
      [field]: Number(value || 0),
    })
    updateDesignJson({
      ...design.design_json,
      bagColorCmyk: nextCmyk,
      bagColorHex: cmykToHex(nextCmyk),
    })
  }

  async function handleUpload(slot: 'slow_main' | 'fast_main' | 'organizer_logo', file: File | null) {
    if (!design || !file) return

    try {
      setUploadingSlot(slot)
      const form = new FormData()
      form.set('slot', slot)
      form.set('file', file)

      const response = await fetch(`/portal/api/bag-designs/${design.id}/upload`, {
        method: 'POST',
        body: form,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Upload failed.')

      setDesign(payload)
      setDesigns((current) => current.map((item) => (item.id === payload.id ? payload : item)))
      setLastSavedSignature(syncSignature(payload))
      setApprovalChecked(false)
      setCartReady(false)
    } catch (error: any) {
      setToast({ kind: 'error', message: error?.message ?? 'Upload failed.' })
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleRender() {
    if (!design) return

    try {
      setRendering(true)
      const response = await fetch(`/portal/api/bag-designs/${design.id}/render`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to render bag proof.')

      setDesign(payload)
      setDesigns((current) => current.map((item) => (item.id === payload.id ? payload : item)))
      setLastSavedSignature(syncSignature(payload))
      setApprovalChecked(false)
      setCartReady(false)
      setToast({ kind: 'success', message: 'Bag proof generated.' })
    } catch (error: any) {
      setToast({ kind: 'error', message: error?.message ?? 'Unable to render bag proof.' })
    } finally {
      setRendering(false)
    }
  }

  async function handleAddToCart() {
    if (!design) return

    try {
      const response = await fetch(`/portal/api/bag-designs/${design.id}/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: approvalChecked }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to add to cart.')

      upsertCustomBagCartItem(payload.cartItem)
      setDesign(payload.design ?? design)
      setDesigns((current) =>
        current.map((item) => (item.id === payload.design?.id ? payload.design : item)),
      )
      setCartReady(true)
      setToast({ kind: 'success', message: 'Custom bag added to the cart.' })
    } catch (error: any) {
      setToast({ kind: 'error', message: error?.message ?? 'Unable to add custom bag to the cart.' })
    }
  }

  if (loading) {
    return <main className="grid min-h-[60vh] place-items-center">Loading bag maker…</main>
  }

  if (!design) {
    return (
      <main className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Organizer Tools</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#0A3161]">Custom Bag Maker</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Build slow-side and fast-side production art, generate one proof image, then hand the approved design
          into the existing cart and Stripe checkout flow.
        </p>
        <button
          type="button"
          onClick={createDraft}
          className="mt-6 rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Create First Draft
        </button>
        {toast ? <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} /> : null}
      </main>
    )
  }

  return (
    <main className="pb-10">
      <header className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0A3161,#17457f)] px-6 py-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Organizer Only V1</p>
            <h1 className="mt-2 text-3xl font-semibold">Custom Bag Maker</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
              Guided layouts only. Production exports render two 2250 x 2250 PNGs and one customer proof, then move
              into the existing cart and payment flow.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 px-4 py-3 text-sm">
            <p>Role: {role}</p>
            <p className="mt-1">Placeholder price: {formatPrice(bagPriceCents)}</p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Draft Control</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Design Setup</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createDraft}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  New Draft
                </button>
                <Link
                  href="/shop"
                  className="rounded-full bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Open Shop
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Current design</span>
                <select
                  value={design.id}
                  onChange={(event) => {
                    const next = designs.find((item) => item.id === event.target.value) ?? null
                    setDesign(next)
                    setLastSavedSignature(syncSignature(next))
                    setApprovalChecked(false)
                    setCartReady(false)
                  }}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                >
                  {designs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id.slice(0, 8)} · {item.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Linked event</span>
                <select
                  value={design.event_id ?? ''}
                  onChange={(event) =>
                    setDesign((current) =>
                      current
                        ? {
                            ...current,
                            event_id: event.target.value || null,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                >
                  <option value="">No event</option>
                  {managedEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Linked club</span>
                <select
                  value={design.club_id ?? ''}
                  onChange={(event) =>
                    setDesign((current) =>
                      current
                        ? {
                            ...current,
                            club_id: event.target.value || null,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                >
                  <option value="">No club</option>
                  {managedClubs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>Status: {design.status}</span>
              <span>Updated: {new Date(design.updated_at).toLocaleString()}</span>
              <span>{saving ? 'Saving changes…' : 'Changes auto-save.'}</span>
            </div>
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Bag Color</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Color and Production Input</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-[120px,1fr] md:items-center">
              <input
                type="color"
                value={design.design_json.bagColorHex}
                onChange={(event) => updateColorFromHex(event.target.value)}
                className="h-16 w-28 rounded-2xl border border-slate-300 bg-white p-1"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">HEX</span>
                  <input
                    value={design.design_json.bagColorHex}
                    onChange={(event) => updateColorFromHex(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['c', 'm', 'y', 'k'] as const).map((channel) => (
                    <label key={channel} className="block text-sm text-slate-700">
                      <span className="mb-1 block font-medium uppercase">{channel}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={design.design_json.bagColorCmyk[channel]}
                        onChange={(event) => updateColorFromCmyk(channel, event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              CMYK values are accepted for convenience. V1 renders final production files as RGB PNG output at 300 DPI.
            </p>
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Artwork Layout</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Guided Side Controls</h2>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 p-1">
                {(['slowSide', 'fastSide'] as SideKey[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setActiveSide(side)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      activeSide === side ? 'bg-[#0A3161] text-white' : 'text-slate-700'
                    }`}
                  >
                    {sideLabel(side)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Template layout</span>
                <select
                  value={selectedSide.layout}
                  onChange={(event) => updateSide('layout', event.target.value as BagDesignJson['slowSide']['layout'])}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                >
                  {BAG_MAKER_LAYOUT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Approved font</span>
                <select
                  value={selectedSide.fontFamily}
                  onChange={(event) => updateSide('fontFamily', event.target.value as BagDesignJson['slowSide']['fontFamily'])}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                >
                  {BAG_MAKER_FONT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Main title or label</span>
                <input
                  value={selectedSide.mainText}
                  onChange={(event) => updateSide('mainText', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="Team name, title sponsor, or event name"
                />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Secondary text</span>
                <input
                  value={selectedSide.secondaryText}
                  onChange={(event) => updateSide('secondaryText', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="Optional subtitle"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr,220px]">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">{sideLabel(activeSide)} main artwork</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => handleUpload(activeSide === 'slowSide' ? 'slow_main' : 'fast_main', event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
                />
              </label>

              <div className="grid gap-3">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Text color</span>
                  <input
                    type="color"
                    value={selectedSide.textColor}
                    onChange={(event) => updateSide('textColor', event.target.value)}
                    className="h-[46px] w-full rounded-2xl border border-slate-300 bg-white p-1"
                  />
                </label>
                <div className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
                  <span className="mb-2 block font-medium">NCO logo placement</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.design_json.slowSide.showNcoLogo}
                      onChange={(event) => toggleNcoLogoSide('slowSide', event.target.checked)}
                    />
                    Slow Side
                  </label>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.design_json.fastSide.showNcoLogo}
                      onChange={(event) => toggleNcoLogoSide('fastSide', event.target.checked)}
                    />
                    Fast Side
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    The NCO logo must appear on at least one side. If both are turned off, Slow Side is restored.
                  </p>
                </div>
              </div>
            </div>

            {sideMainAsset ? (
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {sideMainAsset.original_filename ?? 'Uploaded asset'} · {sideMainAsset.width_px ?? '—'} x{' '}
                {sideMainAsset.height_px ?? '—'} px
              </div>
            ) : null}
            {mainArtWarning ? <p className="mt-2 text-sm text-amber-700">{mainArtWarning}</p> : null}
            {sideMainAsset ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>Drag inside the preview placement zone to move artwork.</span>
                <span>Use the corner handle to resize.</span>
                <button
                  type="button"
                  onClick={() => resetMainArtTransform(activeSide)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset Artwork Position
                </button>
              </div>
            ) : null}
            {uploadingSlot === 'slow_main' || uploadingSlot === 'fast_main' ? (
              <p className="mt-2 text-sm text-slate-500">Uploading artwork…</p>
            ) : null}
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Organizer Mark</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Logo Zones and Locked Branding</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Organizer logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => handleUpload('organizer_logo', event.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
                />
              </label>

              <div className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
                <span className="mb-2 block font-medium">Organizer logo placement</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={design.design_json.slowSide.showOrganizerLogo}
                    onChange={(event) => toggleOrganizerLogoSide('slowSide', event.target.checked)}
                  />
                  Slow Side
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={design.design_json.fastSide.showOrganizerLogo}
                    onChange={(event) => toggleOrganizerLogoSide('fastSide', event.target.checked)}
                  />
                  Fast Side
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Optional. Turn it on for either side, both sides, or neither. The proof can still include the organizer
                  logo at the bottom when one is uploaded.
                </p>
              </div>
            </div>
            {organizerLogo ? (
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {organizerLogo.original_filename ?? 'Organizer logo'} · {organizerLogo.width_px ?? '—'} x{' '}
                {organizerLogo.height_px ?? '—'} px
              </div>
            ) : null}
            {organizerLogoWarning ? <p className="mt-2 text-sm text-amber-700">{organizerLogoWarning}</p> : null}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              The organizer logo stays in the top-left zone on whichever sides you enable. The NCO logo renders in the
              bottom-right and must stay on at least one side, with slow side as the default fallback. Optional overlay
              and mask assets can still be swapped later without changing this page structure.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Preview</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Both Sides</h2>
              </div>
              <p className="text-xs text-slate-500">Preview only: dashed guide stays out of production PNGs.</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <BagPreviewCard
                sideKey="slowSide"
                title="Slow Side"
                side={design.design_json.slowSide}
                bagColor={design.design_json.bagColorHex}
                mainAsset={assetById(design, design.design_json.slowSide.mainAssetId)}
                organizerLogo={organizerLogo}
                active={activeSide === 'slowSide'}
                onSelect={() => setActiveSide('slowSide')}
                onUpdateMainArt={(patch) => updateMainArtTransform('slowSide', patch)}
              />
              <BagPreviewCard
                sideKey="fastSide"
                title="Fast Side"
                side={design.design_json.fastSide}
                bagColor={design.design_json.bagColorHex}
                mainAsset={assetById(design, design.design_json.fastSide.mainAssetId)}
                organizerLogo={organizerLogo}
                active={activeSide === 'fastSide'}
                onSelect={() => setActiveSide('fastSide')}
                onUpdateMainArt={(patch) => updateMainArtTransform('fastSide', patch)}
              />
            </div>
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B31942]">Proof and Checkout</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0A3161]">Render, Approve, Add to Cart</h2>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={rendering}
                onClick={handleRender}
                className="rounded-full bg-[#0A3161] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {rendering ? 'Generating Proof…' : 'Generate Bag Proof'}
              </button>
              <span className="inline-flex items-center rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-600">
                Output: 2 x 2250px production PNGs + 1 x proof
              </span>
            </div>

            {design.proof_url ? (
              <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- Proof URLs may come from storage or data URLs. */}
                <img src={design.proof_url} alt="Customer proof" className="w-full object-cover" />
              </div>
            ) : (
              <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                Generate the proof to create `slow-side-production.png`, `fast-side-production.png`, and
                `customer-proof.png`.
              </div>
            )}

            <label className="mt-5 inline-flex items-start gap-3 rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={approvalChecked}
                disabled={!design.proof_url}
                onChange={(event) => setApprovalChecked(event.target.checked)}
                className="mt-1"
              />
              <span>I approve this design for production.</span>
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!design.proof_url || !approvalChecked}
                onClick={handleAddToCart}
                className="rounded-full bg-[#B31942] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add to Cart
              </button>
              {cartReady ? (
                <Link
                  href="/shop"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open Shop Cart
                </Link>
              ) : null}
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>Production art status: {design.status === 'rendered' || design.status === 'added_to_cart' || design.status === 'ordered' ? 'generated' : 'not generated yet'}</p>
              <p className="mt-1">Proof file: {design.proof_url ? 'ready' : 'not generated yet'}</p>
              {design.proof_url ? (
                <p className="mt-2 text-xs text-slate-500">
                  The server writes production files under `bag-art/{design.id}/...`. Those production PNGs are not
                  exposed to organizer or user clients.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {toast ? <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} /> : null}
    </main>
  )
}

function BagPreviewCard({
  sideKey,
  title,
  side,
  bagColor,
  mainAsset,
  organizerLogo,
  active,
  onSelect,
  onUpdateMainArt,
}: {
  sideKey: SideKey
  title: string
  side: BagDesignJson['slowSide']
  bagColor: string
  mainAsset: BagDesignAssetRecord | null
  organizerLogo: BagDesignAssetRecord | null
  active: boolean
  onSelect: () => void
  onUpdateMainArt: (
    patch: Partial<Pick<BagDesignJson['slowSide'], 'mainArtScale' | 'mainArtOffsetX' | 'mainArtOffsetY'>>,
  ) => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[28px] bg-slate-50 p-4 text-left transition ${
        active ? 'ring-2 ring-[#0A3161]' : 'ring-1 ring-transparent'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">{title}</h3>
        <span className="text-xs text-slate-500">
          {side.layout.replace(/_/g, ' ')}
          {active ? ' · editing' : ''}
        </span>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[330px] overflow-hidden rounded-[26%] border border-slate-300 shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: bagColor }} />
        <div className="absolute left-[18%] top-[18%] h-[16%] w-[20%] rounded-2xl border border-dashed border-slate-400/50" />
        <div className="absolute bottom-[14%] right-[12%] h-[16%] w-[16%] rounded-2xl border border-dashed border-slate-400/50" />
        <div className="absolute left-[23%] top-[23%] h-[54%] w-[54%] rounded-[20%] border-2 border-dashed border-white/65" />

        {side.showOrganizerLogo && organizerLogo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Organizer logos may be storage or data URLs. */}
            <img
              src={organizerLogo.file_url}
              alt="Organizer logo"
              className="absolute left-[18%] top-[16%] h-[18%] w-[20%] object-contain"
            />
          </>
        ) : null}

        <PreviewMainContent
          sideKey={sideKey}
          side={side}
          mainAsset={mainAsset}
          editable={active}
          onUpdateMainArt={onUpdateMainArt}
        />

        {side.showNcoLogo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Local NCO logo falls back between bag-maker and site assets. */}
            <img
              src={BAG_MAKER_PUBLIC_NCO_LOGO_PATH}
              alt="NCO logo"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = BAG_MAKER_FALLBACK_NCO_LOGO_PATH
              }}
              className="absolute bottom-[12%] right-[10%] h-[16%] w-[16%] object-contain"
            />
          </>
        ) : null}
      </div>
    </button>
  )
}

function PreviewMainContent({
  sideKey,
  side,
  mainAsset,
  editable,
  onUpdateMainArt,
}: {
  sideKey: SideKey
  side: BagDesignJson['slowSide']
  mainAsset: BagDesignAssetRecord | null
  editable: boolean
  onUpdateMainArt: (
    patch: Partial<Pick<BagDesignJson['slowSide'], 'mainArtScale' | 'mainArtOffsetX' | 'mainArtOffsetY'>>,
  ) => void
}) {
  const titleClass =
    side.fontFamily === 'Georgia'
      ? 'font-serif'
      : side.fontFamily === 'Oswald'
        ? 'font-extrabold tracking-wide'
        : 'font-semibold'
  const zoneRef = useRef<HTMLDivElement | null>(null)

  if (side.layout === 'text_only') {
    return (
      <div className="absolute left-[23%] top-[23%] flex h-[54%] w-[54%] flex-col items-center justify-center text-center">
        <p className={`text-2xl ${titleClass}`} style={{ color: side.textColor }}>
          {side.mainText || 'Main Text'}
        </p>
        {side.secondaryText ? (
          <p className="mt-2 text-sm" style={{ color: side.textColor }}>
            {side.secondaryText}
          </p>
        ) : null}
      </div>
    )
  }

  const previewBox =
    mainAsset && (mainAsset.width_px ?? 0) > 0 && (mainAsset.height_px ?? 0) > 0
      ? getMainArtPlacementBox({
          layout: side.layout,
          sourceWidth: mainAsset.width_px ?? MAIN_PLACEMENT_SIZE_PX,
          sourceHeight: mainAsset.height_px ?? MAIN_PLACEMENT_SIZE_PX,
          scale: side.mainArtScale,
          offsetX: side.mainArtOffsetX,
          offsetY: side.mainArtOffsetY,
        })
      : null

  function startMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !mainAsset || !zoneRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const zoneRect = zoneRef.current.getBoundingClientRect()
    const startOffsetX = side.mainArtOffsetX
    const startOffsetY = side.mainArtOffsetY
    const startClientX = event.clientX
    const startClientY = event.clientY

    const handleMove = (nextEvent: PointerEvent) => {
      const deltaX = ((nextEvent.clientX - startClientX) / zoneRect.width) * MAIN_PLACEMENT_SIZE_PX
      const deltaY = ((nextEvent.clientY - startClientY) / zoneRect.height) * MAIN_PLACEMENT_SIZE_PX
      onUpdateMainArt({
        mainArtOffsetX: startOffsetX + deltaX,
        mainArtOffsetY: startOffsetY + deltaY,
      })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !mainAsset || !zoneRef.current || !previewBox) return
    event.preventDefault()
    event.stopPropagation()
    const zoneRect = zoneRef.current.getBoundingClientRect()
    const startScale = side.mainArtScale
    const startClientX = event.clientX
    const startClientY = event.clientY
    const startWidthPx = (previewBox.width / MAIN_PLACEMENT_SIZE_PX) * zoneRect.width
    const startHeightPx = (previewBox.height / MAIN_PLACEMENT_SIZE_PX) * zoneRect.height

    const handleMove = (nextEvent: PointerEvent) => {
      const deltaXRatio = (nextEvent.clientX - startClientX) / Math.max(startWidthPx, 1)
      const deltaYRatio = (nextEvent.clientY - startClientY) / Math.max(startHeightPx, 1)
      const nextScale = startScale * (1 + Math.max(deltaXRatio, deltaYRatio))
      onUpdateMainArt({ mainArtScale: clamp(nextScale, MAIN_ART_SCALE_MIN, MAIN_ART_SCALE_MAX) })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
  }

  return (
    <div
      ref={zoneRef}
      className={`absolute left-[23%] top-[23%] h-[54%] w-[54%] ${editable ? 'cursor-default' : ''}`}
      data-side={sideKey}
    >
      {side.layout === 'title_above_logo' && side.mainText ? (
        <p className={`absolute left-0 right-0 top-[8%] text-center text-xl ${titleClass}`} style={{ color: side.textColor }}>
          {side.mainText}
        </p>
      ) : null}
      {mainAsset ? (
        <div
          className={`absolute ${editable ? 'cursor-move' : ''}`}
          style={
            previewBox
              ? {
                  left: `${(previewBox.left / MAIN_PLACEMENT_SIZE_PX) * 100}%`,
                  top: `${(previewBox.top / MAIN_PLACEMENT_SIZE_PX) * 100}%`,
                  width: `${(previewBox.width / MAIN_PLACEMENT_SIZE_PX) * 100}%`,
                  height: `${(previewBox.height / MAIN_PLACEMENT_SIZE_PX) * 100}%`,
                  touchAction: 'none',
                }
              : {
                  left: '12.5%',
                  top: '15%',
                  width: '75%',
                  height: '70%',
                  touchAction: 'none',
                }
          }
          data-editable={editable ? 'true' : 'false'}
          onPointerDown={startMove}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Artwork previews may be storage or data URLs. */}
          <img src={mainAsset.file_url} alt="Main artwork" className="h-full w-full object-contain" draggable={false} />
          {editable ? (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-dashed border-[#0A3161]/60" />
              <div
                className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/3 translate-y-1/3 rounded-full border border-white bg-[#0A3161] shadow-sm"
                style={{ touchAction: 'none' }}
                onPointerDown={startResize}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div className="absolute left-[12%] top-[15%] rounded-3xl border border-dashed border-slate-400/60 px-6 py-10 text-sm text-slate-500">
          Artwork
        </div>
      )}
      {side.layout === 'logo_with_title_below' && side.mainText ? (
        <p
          className={`absolute bottom-[12%] left-0 right-0 text-center text-xl ${titleClass}`}
          style={{ color: side.textColor }}
        >
          {side.mainText}
        </p>
      ) : null}
      {side.layout === 'sponsor_layout' && side.mainText ? (
        <p
          className={`absolute left-0 right-0 top-[6%] text-center text-lg ${titleClass}`}
          style={{ color: side.textColor }}
        >
          {side.mainText}
        </p>
      ) : null}
      {side.secondaryText ? (
        <p
          className={`absolute left-0 right-0 ${side.layout === 'sponsor_layout' ? 'bottom-[10%]' : 'bottom-[8%]'} text-center text-sm`}
          style={{ color: side.textColor }}
        >
          {side.secondaryText}
        </p>
      ) : null}
    </div>
  )
}
