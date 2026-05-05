'use client'

import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { supabase } from '@/app/lib/supabaseClient'

type Props = {
  slug: string
  onSaved?: (path: string | null) => void
}

export default function LogoPanel({ slug, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onFile = (f: File | null) => {
    setFile(f)
    setError(null)
    setMessage(null)
    if (f) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!file) {
      setError('Pick a file first.')
      return
    }

    try {
      setSubmitting(true)

      // Ensure we are logged in – this keeps RLS happy.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be signed in to upload.')
        return
      }

      // Correct bucket for EVENT LOGOS:
      const bucket = 'event-logos'

      // Key convention: <eventSlug>/logo-<timestamp>.<ext>
      const ext = file.name.split('.').pop() || 'png'
      const key = `${slug}/logo-${Date.now()}.${ext}`

      const { error: upErr } = await supabase
        .storage
        .from(bucket)
        .upload(key, file, { upsert: true })

      if (upErr) {
        setError(upErr.message)
        return
      }

      setMessage('Event logo uploaded.')
      onSaved?.(`${bucket}/${key}`)
      setFile(null)
      setPreview(null)
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Event Logo</h3>
      </div>

      <form onSubmit={handleUpload} className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        {preview && (
          <div className="mt-2">
            <img src={preview} alt="preview" className="h-24 rounded border object-contain" />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !file}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 disabled:opacity-50"
        >
          {submitting ? <Spinner size={16} /> : null}
          Upload
        </button>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
