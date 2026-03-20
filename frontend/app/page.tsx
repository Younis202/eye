'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default function Root() {
  const router = useRouter()
  useEffect(() => {
    const p = getProfile()
    if (!p?.setupDone) router.replace('/onboarding/role')
    else router.replace('/dashboard')
  }, [])
  return null
}
