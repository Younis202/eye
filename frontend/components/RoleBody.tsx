'use client'
import { useEffect } from 'react'
import { getProfile } from '@/lib/auth'

export default function RoleBody({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const p = getProfile()
    if (p?.role) document.body.setAttribute('data-role', p.role)
    return () => document.body.removeAttribute('data-role')
  }, [])
  return <>{children}</>
}
