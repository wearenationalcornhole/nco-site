// app/portal/org/profile/page.tsx
import dynamic from 'next/dynamic'

// Keep the page a Server Component and lazy-load the client UI
const Client = dynamic(() => import('./Client'), { ssr: false })

export default function Page() {
  return <Client />
}