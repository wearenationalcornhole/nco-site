// app/portal/org/events/[slug]/page.tsx
import Client from './Client'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <Client slug={slug} />
}