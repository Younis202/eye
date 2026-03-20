'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default function OnboardingIndex() {
  const router = useRouter()
  useEffect(() => {
    const p = getProfile()
    if (!p) router.replace('/onboarding/role')
    else if (!p.setupDone) router.replace('/onboarding/org')
    else router.replace('/dashboard')
  }, [])
  return null
}
