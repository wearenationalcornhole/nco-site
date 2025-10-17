// app/portal/players/page.tsx
import Client from './Client'

export default async function Page({}: { params?: Promise<any>; searchParams?: Promise<any> }) {
  // Keep it simple; the Client does all loading via fetch to /portal/api/players
  return <Client />
}