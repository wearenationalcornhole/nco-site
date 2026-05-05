// app/lib/devAuth.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Role = 'PLAYER' | 'ORGANIZER' | 'ADMIN'
type User = { id: string; name: string; email: string; role: Role }

const AuthCtx = createContext<{
  user: User | null
  loginAs: (role: Role) => void
  logout: () => void
}>({ user: null, loginAs: () => {}, logout: () => {} })

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('nco:user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  function loginAs(role: Role) {
    const u: User = {
      id: 'dev-' + role.toLowerCase(),
      name: role === 'PLAYER' ? 'Player One'
        : role === 'ORGANIZER' ? 'Organizer One'
        : 'Admin',
      email: `${role.toLowerCase()}@example.com`,
      role,
    }
    localStorage.setItem('nco:user', JSON.stringify(u))
    setUser(u)
  }
  function logout() {
    localStorage.removeItem('nco:user')
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, loginAs, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() { return useContext(AuthCtx) }