'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/portal/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Delete failed')
      router.refresh()
    } catch (e) {
      alert('Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={onDelete} disabled={busy} className="rounded border px-3 py-1 text-sm hover:bg-gray-50 text-red-700 border-red-300">
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  )
}