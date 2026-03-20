export type UserRole = 'clinic' | 'hospital' | 'ministry'

export interface OrgProfile {
  role: UserRole
  orgName: string
  orgType: string
  country: string
  doctorName: string
  specialty: string
  licenseNo: string
  email: string
  setupDone: boolean
}

const KEY = 'rg_org_v5'

export function getProfile(): OrgProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveProfile(p: Partial<OrgProfile>) {
  if (typeof window === 'undefined') return
  const existing = getProfile() || {}
  localStorage.setItem(KEY, JSON.stringify({ ...existing, ...p }))
}

export function clearProfile() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function isSetupDone(): boolean {
  return getProfile()?.setupDone === true
}

export const ROLE_META = {
  clinic: {
    label: 'Private Clinic',
    sub: 'Solo ophthalmologist or small practice',
    description: 'Upload a fundus image, get instant AI diagnosis, generate PDF reports and manage your patients — all in one place.',
    color: '#7C3AED',
    colorDark: '#5B21B6',
    bg: '#F5F3FF',
    border: 'rgba(124,58,237,0.22)',
    dim: 'rgba(124,58,237,0.08)',
    nav: ['scan','patients','reports','referrals','progression','copilot'],
    features: [
      'AI fundus analysis — DR · AMD · Glaucoma',
      'Patient records with full medical history',
      'Longitudinal DR progression tracking',
      'Referral creation and tracking',
      'AI Copilot per scan',
      'PDF clinical reports',
    ],
  },
  hospital: {
    label: 'Hospital / Eye Department',
    sub: 'Multi-doctor team with department head',
    description: 'Full department management — triage queue, batch screening, team analytics and inter-hospital referral pipeline.',
    color: '#2563EB',
    colorDark: '#1D4ED8',
    bg: '#EFF6FF',
    border: 'rgba(37,99,235,0.22)',
    dim: 'rgba(37,99,235,0.08)',
    nav: ['scan','patients','batch','reports','referrals','team','analytics'],
    features: [
      'Everything in Clinic plan',
      'Live triage queue with priority scoring',
      'Batch screening for multiple patients',
      'Department-level analytics dashboard',
      'Team management & role assignment',
      'Similar case retrieval (FAISS AI)',
    ],
  },
  ministry: {
    label: 'Ministry of Health',
    sub: 'National screening programme & WHO reporting',
    description: 'National-scale intelligence dashboard — prevalence maps, hospital rankings, WHO-format exports and policy alerts.',
    color: '#7C3AED',
    colorDark: '#4C1D95',
    bg: '#F5F3FF',
    border: 'rgba(124,58,237,0.22)',
    dim: 'rgba(124,58,237,0.08)',
    nav: ['analytics','population','referrals','export','settings'],
    features: [
      'National DR prevalence dashboard',
      'Multi-hospital data aggregation',
      'Population-level screening coverage',
      'WHO-format data export',
      'Policy & compliance KPIs',
      'Real-time alerts & thresholds',
    ],
  },
} as const
