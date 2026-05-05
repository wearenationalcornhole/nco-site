'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { InventoryStatus } from '@/app/lib/store/catalog'

type AdminStoreProduct = {
  id: string
  title: string
  slug: string
  price: number
  category: string
  description: string
  shortDescription: string
  images: string[]
  bagSpecs: {
    series: string
    fill: string
    material: string
    weight: string
    size: string
    breakIn: string
  }
  speedRating: number
  controlRating: number
  inventoryStatus: InventoryStatus
  featured: boolean
  isActive: boolean
}

type FormState = {
  id?: string
  title: string
  slug: string
  priceDollars: string
  category: string
  description: string
  shortDescription: string
  imagesText: string
  bagSeries: string
  bagFill: string
  bagMaterial: string
  bagWeight: string
  bagSize: string
  bagBreakIn: string
  speedRating: string
  controlRating: string
  inventoryStatus: InventoryStatus
  featured: boolean
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  priceDollars: '',
  category: 'Competition Bags',
  description: '',
  shortDescription: '',
  imagesText: '',
  bagSeries: '',
  bagFill: '',
  bagMaterial: '',
  bagWeight: '',
  bagSize: '',
  bagBreakIn: '',
  speedRating: '0',
  controlRating: '0',
  inventoryStatus: 'in_stock',
  featured: false,
  isActive: true,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toFormState(product: AdminStoreProduct): FormState {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    priceDollars: (product.price / 100).toFixed(2),
    category: product.category,
    description: product.description,
    shortDescription: product.shortDescription,
    imagesText: product.images.join('\n'),
    bagSeries: product.bagSpecs.series,
    bagFill: product.bagSpecs.fill,
    bagMaterial: product.bagSpecs.material,
    bagWeight: product.bagSpecs.weight,
    bagSize: product.bagSpecs.size,
    bagBreakIn: product.bagSpecs.breakIn,
    speedRating: String(product.speedRating),
    controlRating: String(product.controlRating),
    inventoryStatus: product.inventoryStatus,
    featured: product.featured,
    isActive: product.isActive,
  }
}

function inventoryLabel(status: InventoryStatus) {
  switch (status) {
    case 'in_stock':
      return 'In Stock'
    case 'low_stock':
      return 'Low Stock'
    case 'preorder':
      return 'Preorder'
    case 'sold_out':
      return 'Sold Out'
  }
}

export default function StoreAdminClient() {
  const [products, setProducts] = useState<AdminStoreProduct[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await fetch('/portal/api/store/products', { cache: 'no-store' })
        const payload = await response.json().catch(() => ([]))
        if (!response.ok) throw new Error(payload?.error ?? 'Failed to load products')
        if (!alive) return
        setProducts(payload)
        if (payload.length > 0) {
          setSelectedId(payload[0].id)
          setForm(toFormState(payload[0]))
        }
      } catch (err: any) {
        if (!alive) return
        setError(err?.message ?? 'Failed to load products')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products],
  )

  function selectProduct(product: AdminStoreProduct) {
    setSelectedId(product.id)
    setForm(toFormState(product))
    setMessage(null)
    setError(null)
  }

  function startNewProduct() {
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setMessage(null)
    setError(null)
  }

  async function refreshProducts(nextSelectedId?: string | null) {
    const response = await fetch('/portal/api/store/products', { cache: 'no-store' })
    const payload = await response.json().catch(() => ([]))
    if (!response.ok) throw new Error(payload?.error ?? 'Failed to load products')
    setProducts(payload)

    const selected =
      payload.find((product: AdminStoreProduct) => product.id === nextSelectedId) ??
      payload[0] ??
      null

    if (selected) {
      setSelectedId(selected.id)
      setForm(toFormState(selected))
    } else {
      setSelectedId(null)
      setForm(EMPTY_FORM)
    }
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        price: Math.round(Number(form.priceDollars || '0') * 100),
        category: form.category,
        description: form.description,
        shortDescription: form.shortDescription,
        images: form.imagesText
          .split('\n')
          .map((image) => image.trim())
          .filter(Boolean),
        bagSpecs: {
          series: form.bagSeries,
          fill: form.bagFill,
          material: form.bagMaterial,
          weight: form.bagWeight,
          size: form.bagSize,
          breakIn: form.bagBreakIn,
        },
        speedRating: Number(form.speedRating || '0'),
        controlRating: Number(form.controlRating || '0'),
        inventoryStatus: form.inventoryStatus,
        featured: form.featured,
        isActive: form.isActive,
      }

      const response = await fetch(
        form.id ? `/portal/api/store/products/${encodeURIComponent(form.id)}` : '/portal/api/store/products',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error ?? 'Save failed')

      await refreshProducts(body?.id ?? form.id ?? null)
      setMessage(form.id ? 'Product updated.' : 'Product created.')
    } catch (err: any) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function archiveProduct(product: AdminStoreProduct) {
    const confirmed = window.confirm(`Archive ${product.title}? The product will disappear from the public store.`)
    if (!confirmed) return

    try {
      setArchivingId(product.id)
      const response = await fetch(`/portal/api/store/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error ?? 'Archive failed')
      await refreshProducts(selectedId === product.id ? null : selectedId)
      setMessage('Product archived.')
    } catch (err: any) {
      setError(err?.message ?? 'Archive failed')
    } finally {
      setArchivingId(null)
    }
  }

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-gray-600">Loading store catalog…</div>
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A3161]">Catalog</h2>
            <p className="mt-1 text-sm text-gray-600">{activeProducts.length} active products in the public store.</p>
          </div>
          <button
            type="button"
            onClick={startNewProduct}
            className="rounded bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            New Product
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => selectProduct(product)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedId === product.id ? 'border-[#0A3161] bg-[#0A3161]/5' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.slug}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    ${(product.price / 100).toFixed(2)} · {product.category} · {inventoryLabel(product.inventoryStatus)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{product.featured ? 'Featured' : 'Standard'}</p>
                  <p>{product.isActive ? 'Active' : 'Archived'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0A3161]">{form.id ? 'Edit Product' : 'Create Product'}</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage the storefront without touching code. Image URLs can point at Supabase Storage or any existing CDN asset.
            </p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-[#0A3161] hover:underline">
            View Store
          </Link>
        </div>

        <form onSubmit={saveProduct} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" required />
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: slugify(e.target.value) }))} className="w-full rounded border px-3 py-2 text-sm" required />
            </Field>
            <Field label="Price (USD)">
              <input value={form.priceDollars} onChange={(e) => setForm((current) => ({ ...current, priceDollars: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" inputMode="decimal" required />
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" required />
            </Field>
          </div>

          <Field label="Short Description">
            <input value={form.shortDescription} onChange={(e) => setForm((current) => ({ ...current, shortDescription: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" required />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[120px] w-full rounded border px-3 py-2 text-sm" required />
          </Field>

          <Field label="Image URLs (one per line)">
            <textarea value={form.imagesText} onChange={(e) => setForm((current) => ({ ...current, imagesText: e.target.value }))} className="min-h-[90px] w-full rounded border px-3 py-2 text-sm" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Bag Series">
              <input value={form.bagSeries} onChange={(e) => setForm((current) => ({ ...current, bagSeries: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Fill">
              <input value={form.bagFill} onChange={(e) => setForm((current) => ({ ...current, bagFill: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Material">
              <input value={form.bagMaterial} onChange={(e) => setForm((current) => ({ ...current, bagMaterial: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Weight">
              <input value={form.bagWeight} onChange={(e) => setForm((current) => ({ ...current, bagWeight: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Size">
              <input value={form.bagSize} onChange={(e) => setForm((current) => ({ ...current, bagSize: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
            <Field label="Break-In">
              <input value={form.bagBreakIn} onChange={(e) => setForm((current) => ({ ...current, bagBreakIn: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Speed Rating">
              <input value={form.speedRating} onChange={(e) => setForm((current) => ({ ...current, speedRating: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" inputMode="numeric" />
            </Field>
            <Field label="Control Rating">
              <input value={form.controlRating} onChange={(e) => setForm((current) => ({ ...current, controlRating: e.target.value }))} className="w-full rounded border px-3 py-2 text-sm" inputMode="numeric" />
            </Field>
            <Field label="Inventory">
              <select value={form.inventoryStatus} onChange={(e) => setForm((current) => ({ ...current, inventoryStatus: e.target.value as InventoryStatus }))} className="w-full rounded border px-3 py-2 text-sm">
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="preorder">Preorder</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm((current) => ({ ...current, featured: e.target.checked }))} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} />
              Active in public store
            </label>
          </div>

          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded bg-[#B31942] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {saving ? 'Saving…' : form.id ? 'Save Product' : 'Create Product'}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => {
                  const current = products.find((product) => product.id === form.id)
                  if (current) void archiveProduct(current)
                }}
                disabled={archivingId === form.id}
                className="rounded border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {archivingId === form.id ? 'Archiving…' : 'Archive Product'}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
