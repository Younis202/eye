'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import { getProfile, clearProfile, ROLE_META, type UserRole } from '@/lib/auth'
import {
  ScanLine, Users, Layers, FileText, ArrowLeftRight, TrendingUp,
  Search, BarChart3, Settings2, Bell, X, LogOut, Globe, Building2,
  Stethoscope, ChevronDown, Activity, AlertTriangle, Eye,
  LayoutDashboard, Clock, ShieldAlert, Download,
} from 'lucide-react'

/* ── Per-role navigation (completely separate per system) ── */
const NAV: Record<UserRole, { section: string; items: { href: string; Icon: any; label: string; badge?: string }[] }[]> = {
  clinic: [
    { section: 'Patient Journey', items: [
      { href: '/analyze',     Icon: ScanLine,      label: 'AI Scan',          badge: 'AI' },
      { href: '/patients',    Icon: Users,          label: 'My Patients' },
      { href: '/reports',     Icon: FileText,       label: 'Scan Reports' },
    ]},
    { section: 'Follow-up', items: [
      { href: '/referrals',   Icon: ArrowLeftRight, label: 'Referrals' },
      { href: '/progression', Icon: TrendingUp,     label: 'DR Progression' },
      { href: '/search',      Icon: Search,         label: 'Similar Cases' },
    ]},
    { section: 'Settings', items: [
      { href: '/settings',    Icon: Settings2,      label: 'Settings' },
    ]},
  ],
  hospital: [
    { section: 'Operations', items: [
      { href: '/triage',      Icon: AlertTriangle,  label: 'Triage Queue',     badge: 'LIVE' },
      { href: '/analyze',     Icon: ScanLine,       label: 'AI Scan',          badge: 'AI' },
      { href: '/batch',       Icon: Layers,         label: 'Batch Screening' },
    ]},
    { section: 'Management', items: [
      { href: '/patients',    Icon: Users,          label: 'All Patients' },
      { href: '/reports',     Icon: FileText,       label: 'Reports' },
      { href: '/referrals',   Icon: ArrowLeftRight, label: 'Referral Pipeline' },
    ]},
    { section: 'Intelligence', items: [
      { href: '/analytics',   Icon: BarChart3,      label: 'Dept Analytics' },
      { href: '/settings',    Icon: Settings2,      label: 'Settings' },
    ]},
  ],
  ministry: [
    { section: 'Intelligence', items: [
      { href: '/analytics',   Icon: BarChart3,      label: 'National Dashboard', badge: 'LIVE' },
      { href: '/prevalence',  Icon: Globe,          label: 'Prevalence Map' },
      { href: '/reports',     Icon: FileText,       label: 'Hospital Reports' },
    ]},
    { section: 'Governance', items: [
      { href: '/referrals',   Icon: ArrowLeftRight, label: 'National Pipeline' },
      { href: '/alerts',      Icon: ShieldAlert,    label: 'Policy Alerts' },
      { href: '/export',      Icon: Download,       label: 'WHO Export' },
    ]},
    { section: 'System', items: [
      { href: '/settings',    Icon: Settings2,      label: 'Settings' },
    ]},
  ],
}

const ROLE_ICONS: Record<UserRole, any> = {
  clinic:   Stethoscope,
  hospital: Building2,
  ministry: Globe,
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path   = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<ReturnType<typeof getProfile>>(null)
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [showN,   setShowN]   = useState(false)
  const [showU,   setShowU]   = useState(false)

  useEffect(() => {
    const p = getProfile()
    setProfile(p)
    if (p?.role) document.body.setAttribute('data-role', p.role)
    if (!p?.setupDone && !path.startsWith('/onboarding')) router.replace('/onboarding')
  }, [path])

  /* Skip shell for onboarding / login */
  if (path.startsWith('/onboarding') || path.startsWith('/passport') || path === '/login') {
    return <>{children}</>
  }
  if (!profile?.setupDone) return null

  const role     = (profile?.role || 'clinic') as UserRole
  const meta     = ROLE_META[role]
  const navSecs  = NAV[role] || NAV.clinic
  const RoleIcon = ROLE_ICONS[role]
  const isActive = (href: string) => path === href || (href !== '/dashboard' && path.startsWith(href))
  const urgent   = notifs.filter(n => n.severity === 'critical').length
  const currentLabel = navSecs.flatMap(s => s.items).find(i => isActive(i.href))?.label || 'Dashboard'

  const logout = () => {
    clearProfile()
    document.body.removeAttribute('data-role')
    router.replace('/onboarding/role')
  }

  return (
    <div className="shell">

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside className="sidebar">

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-mark">
              <Eye size={18} color="#C4B5FD" strokeWidth={2}/>
            </div>
            <div>
              <div className="brand-name">RETINA<span>GPT</span></div>
              <div className="brand-ver">v6.0 · CLINICAL AI</div>
            </div>
          </div>
        </div>

        {/* Role pill */}
        <div className="role-pill" style={{ margin:'10px 12px 6px' }}>
          <div className="role-pill-icon"><RoleIcon size={15} strokeWidth={1.8}/></div>
          <div style={{ minWidth:0 }}>
            <div className="role-pill-name">{meta.label}</div>
            <div className="role-pill-org">{profile?.orgName || 'Your organisation'}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSecs.map(sec => (
            <div key={sec.section}>
              <div className="nav-section-label">{sec.section}</div>
              {sec.items.map(({ href, Icon, label, badge }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
                    <Icon className="nav-icon" size={14} strokeWidth={active ? 2.2 : 1.7}/>
                    <span>{label}</span>
                    {badge && <span className="nav-badge">{badge}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <div className="ai-status">
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
              <div className="ai-dot"/>
              <span style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, color:'#10B981', letterSpacing:'0.12em' }}>AI ONLINE</span>
              <span style={{ fontFamily:'var(--f-mono)', fontSize:8, color:'rgba(255,255,255,0.30)', marginLeft:'auto' }}>9 models</span>
            </div>
            <div style={{ fontFamily:'var(--f-mono)', fontSize:8, color:'rgba(255,255,255,0.25)' }}>avg 1.4s · DR · AMD · Glaucoma</div>
          </div>
          {role !== 'ministry' && (
            <Link href="/analyze">
              <button className="btn btn-sm" style={{ width:'100%', justifyContent:'center', background:'rgba(196,181,253,0.15)', border:'1px solid rgba(196,181,253,0.22)', color:'#C4B5FD', borderRadius:'var(--r-md)' }}>
                <ScanLine size={12}/> New Scan
              </button>
            </Link>
          )}
        </div>
      </aside>

      {/* ══════════════════ MAIN AREA ══════════════════ */}
      <div className="main-area">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="topbar-page-title">{currentLabel}</div>
            <div className="topbar-breadcrumb">{profile?.orgName} · {currentLabel}</div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* AI status */}
            <div className="ai-badge">
              <div className="ai-dot"/> System Ready
            </div>

            {/* Notifications */}
            <div style={{ position:'relative' }}>
              <button className="icon-btn"
                style={urgent > 0 ? { background:'var(--red-dim)', borderColor:'var(--red-border)', color:'var(--red)' } : {}}
                onClick={() => {
                  setShowN(v => !v); setShowU(false)
                  if (!showN) axios.get('/api/retina/notifications')
                    .then(r => setNotifs(r.data.notifications || []))
                    .catch(() => {})
                }}>
                <Bell size={15} strokeWidth={1.7}/>
                {urgent > 0 && (
                  <span style={{ position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff',
                    borderRadius:'50%', width:15, height:15, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:8, fontWeight:700, fontFamily:'var(--f-mono)',
                    border:'2px solid var(--bg)' }}>
                    {urgent}
                  </span>
                )}
              </button>

              {showN && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <span style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--ink)' }}>Notifications</span>
                    <button onClick={() => setShowN(false)} className="icon-btn" style={{ width:26, height:26 }}><X size={12}/></button>
                  </div>
                  {notifs.length === 0
                    ? <div style={{ padding:'28px 20px', textAlign:'center', color:'var(--ink-4)', fontSize:12 }}>All clear — no notifications</div>
                    : notifs.map((n, i) => (
                        <Link key={i} href={n.link || '/dashboard'} onClick={() => setShowN(false)}>
                          <div className="notif-item">
                            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                                background: n.severity==='critical' ? 'var(--red)' : n.severity==='high' ? 'var(--amber)' : 'var(--blue)' }}/>
                              <span style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, color:'var(--ink)' }}>{n.title}</span>
                            </div>
                            <div style={{ fontSize:11, color:'var(--ink-4)', paddingLeft:13, lineHeight:1.4 }}>{n.body}</div>
                          </div>
                        </Link>
                      ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div style={{ position:'relative' }}>
              <button
                onClick={() => { setShowU(v => !v); setShowN(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface)',
                  border:'1px solid var(--border-2)', borderRadius:'var(--r-pill)',
                  padding:'5px 12px 5px 6px', cursor:'pointer', transition:'all 0.15s',
                  boxShadow:'var(--shadow-xs)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = meta.border }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%',
                  background:`${meta.color}12`,
                  border:`1.5px solid ${meta.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--f-display)', fontSize:11, color:meta.color }}>
                  {(profile?.doctorName || 'Dr').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, color:'var(--ink)', letterSpacing:'0.02em' }}>
                    {profile?.doctorName?.split(' ').slice(0, 2).join(' ') || 'Doctor'}
                  </div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:8, color:'var(--ink-4)' }}>
                    {profile?.specialty?.split(' ')[0] || meta.label}
                  </div>
                </div>
                <ChevronDown size={11} style={{ color:'var(--ink-4)', marginLeft:2 }}/>
              </button>

              {showU && (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:200,
                  background:'var(--surface)', border:'1px solid var(--border-2)',
                  borderRadius:'var(--r-xl)', boxShadow:'var(--shadow-lg)', zIndex:400,
                  overflow:'hidden', animation:'slide-down 0.15s ease' }}>
                  <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, color:'var(--ink)' }}>
                      {profile?.doctorName || 'Doctor'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--ink-4)', marginTop:1 }}>{profile?.email || ''}</div>
                  </div>
                  <Link href="/settings" onClick={() => setShowU(false)}>
                    <div style={{ padding:'10px 16px', fontSize:12, color:'var(--ink-2)', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:8, transition:'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                      <Settings2 size={13}/> Settings
                    </div>
                  </Link>
                  <button onClick={logout}
                    style={{ width:'100%', padding:'10px 16px', fontSize:12, color:'var(--red)',
                      cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                      background:'none', border:'none', borderTop:'1px solid var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--red-dim)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                    <LogOut size={13}/> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main onClick={() => { showN && setShowN(false); showU && setShowU(false) }}>
          {children}
        </main>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--r-lg)',
            fontFamily: 'var(--f-cond)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' } },
        }}
      />
    </div>
  )
}
