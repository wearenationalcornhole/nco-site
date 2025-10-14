// app/portal/login/page.tsx
import LoginClient from './LoginClient'

// Optional: either is fine; we just need the server page to render a client child.
export const revalidate = 0
export const dynamic = 'force-static'

export default function Page() {
  return <LoginClient />
}