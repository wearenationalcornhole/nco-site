// app/lib/safePrisma.ts
import { PrismaClient } from '@prisma/client'

let prismaInstance: PrismaClient | null = null

export function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null
  if (prismaInstance) return prismaInstance
  try {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
    return prismaInstance
  } catch {
    return null
  }
}