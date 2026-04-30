import { supabase } from '@/app/lib/supabaseClient'
import { BUCKETS } from './constants'

export async function uploadEventLogo(slug: string, file: File) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const key = `${slug}/logo-${Date.now()}.${ext}`
  const bucket = BUCKETS.eventLogo

  const { error } = await supabase.storage.from(bucket).upload(key, file, { upsert: true })
  if (error) throw error

  // You can build a public URL immediately for event-logos (public-read):
  const publicUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`

  return { bucket, key, publicUrl }
}
