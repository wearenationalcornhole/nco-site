// app/portal/events/[slug]/page.tsx
import Client from './Client'

export default function Page({ params }: { params: { slug: string } }) {
  return <Client slug={params.slug} />
}