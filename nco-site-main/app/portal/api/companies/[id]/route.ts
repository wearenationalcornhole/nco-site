export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/safePrisma'
import { devStore } from '@/app/lib/devStore'

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params
    const prisma = await getPrisma()

    if (prisma) {
      const SponsorCompanies = (prisma as any).sponsor_companies
      if (!SponsorCompanies) throw new Error('Model sponsor_companies not found')

      const row = await SponsorCompanies.findUnique({ where: { id } })
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      return NextResponse.json({
        id: row.id,
        name: row.name,
        website: row.website ?? null,
        logo: row.logo_url ?? null,
        logoHash: row.logo_hash ?? null,
        createdAt: row.created_at ?? null,
      })
    }

    // devStore fallback
    const row = devStore.getById<any>('sponsor_companies', id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      id: row.id,
      name: row.name,
      website: row.website ?? null,
      logo: row.logoUrl ?? null,
      logoHash: row.logoHash ?? null,
      createdAt: row.createdAt ?? null,
    })
  } catch (e: any) {
    console.error('GET /portal/api/companies/[id] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}