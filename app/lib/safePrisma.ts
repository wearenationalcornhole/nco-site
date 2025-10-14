// app/lib/safePrisma.ts
let prismaInstance: any | null = null

export async function getPrisma() {
  // If DATABASE_URL is not set, skip Prisma (fallback to devStore)
  if (!process.env.DATABASE_URL) return null
  if (prismaInstance) return prismaInstance
  try {
    // Lazy import so build/routes don't crash if @prisma/client isn't ready
    const { PrismaClient } = await import('@prisma/client')
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
    return prismaInstance
  } catch {
    return null
  }
}