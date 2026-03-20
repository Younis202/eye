'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, saveProfile } from '@/lib/auth'
import { Database, ScanLine, ArrowRight, Loader2, Check } from 'lucide-react'
import axios from 'axios'

export default function OrgSetupPage() {
  const router   = useRouter()
  const profile  = getProfile()
  const [choice,  setChoice]  = useState<'demo' | 'real' | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [done,    setDone]    = useState(false)

  const seedDemo = async () => {
    setSeeding(true)
    try { await axios.post('/api/retina/demo/seed') } catch {}
    finally { setSeeding(false); setDone(true) }
  }

  const enter = async (withDemo: boolean) => {
    if (withDemo && !done) await seedDemo()
    saveProfile({ setupDone: true })
    router.push('/dashboard')
  }

  const OPTIONS = [
    {
      id: 'demo' as const,
      Icon: Database,
      title: 'Load demo data',
      sub: '12 seeded patients across all DR grades',
      points: [
        'All 5 DR grades represented',
        'Complete referral pipeline to explore',
        '30 days of scan history',
        'Deletable — never affects real data',
      ],
      color: '#059669',
      bg: 'rgba(5,150,105,0.06)',
      border: 'rgba(5,150,105,0.22)',
    },
    {
      id: 'real' as const,
      Icon: ScanLine,
      title: 'First real scan',
      sub: 'Upload a fundus image and start immediately',
      points: [
        'Go straight to the AI scan interface',
        'Register your first patient record',
        'Clinical report in ~2 seconds',
        'Full workflow: scan → report → referral',
      ],
      color: '#7C3AED',
      bg: 'rgba(124,58,237,0.06)',
      border: 'rgba(124,58,237,0.22)',
    },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
      <div style={{ width:'100%', maxWidth:620 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:44 }} className="anim-up">
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px',
            borderRadius:'var(--r-pill)', background:'rgba(5,150,105,0.08)',
            border:'1px solid rgba(5,150,105,0.2)', marginBottom:18 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#059669' }}/>
            <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700,
              letterSpacing:'0.14em', color:'#059669', textTransform:'uppercase' }}>Account created</span>
          </div>
          <div style={{ fontFamily:'var(--f-display)', fontSize:44, letterSpacing:'0.02em',
            color:'var(--ink)', lineHeight:1.05, marginBottom:10 }}>
            How do you want<br/>to begin?
          </div>
          <div style={{ fontSize:14, color:'var(--ink-3)', lineHeight:1.6 }}>
            Welcome, {profile?.doctorName?.split(' ')[0] || 'Doctor'}. Choose how to start your workspace.
          </div>
        </div>

        {/* Options */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }} className="anim-up-1">
          {OPTIONS.map(({ id, Icon, title, sub, points, color, bg, border }) => (
            <button key={id} onClick={() => setChoice(id)}
              style={{ background: choice===id ? bg : '#FFFFFF',
                border: `2px solid ${choice===id ? color : 'var(--border)'}`,
                borderRadius:20, padding:'24px 22px', cursor:'pointer', textAlign:'left',
                transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: choice===id ? `0 12px 32px ${border}` : 'var(--shadow-xs)',
                transform: choice===id ? 'translateY(-3px)' : 'none',
                position:'relative', overflow:'hidden' }}>

              {/* Selected check */}
              {choice === id && (
                <div style={{ position:'absolute', top:14, right:14, width:22, height:22,
                  borderRadius:'50%', background:color,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Check size={11} color="#fff" strokeWidth={2.5}/>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:12,
                  background: choice===id ? bg : 'var(--bg)',
                  border: `1px solid ${choice===id ? color : 'var(--border)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.18s' }}>
                  <Icon size={20} strokeWidth={1.8} style={{ color: choice===id ? color : 'var(--ink-3)', transition:'color 0.18s' }}/>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:15, fontWeight:700,
                    color: choice===id ? color : 'var(--ink)', letterSpacing:'0.02em',
                    transition:'color 0.18s' }}>{title}</div>
                  <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:2 }}>{sub}</div>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {points.map(p => (
                  <div key={p} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <div style={{ width:15, height:15, borderRadius:'50%',
                      background: choice===id ? color : 'rgba(5,150,105,0.10)',
                      border: `1px solid ${choice===id ? color : 'rgba(5,150,105,0.2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0, marginTop:1, transition:'all 0.18s' }}>
                      <Check size={7} color={choice===id ? '#fff' : '#059669'} strokeWidth={2.5}/>
                    </div>
                    <span style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="anim-up-2">
          {choice ? (
            <button className="btn btn-primary btn-lg"
              style={{ width:'100%', justifyContent:'center' }}
              onClick={() => enter(choice === 'demo')}
              disabled={seeding}>
              {seeding
                ? <><Loader2 size={16} className="spin"/> Generating demo data…</>
                : <>{choice === 'demo' && !done ? 'Load demo & enter platform' : 'Enter platform'} <ArrowRight size={15}/></>}
            </button>
          ) : (
            <div style={{ textAlign:'center', fontFamily:'var(--f-cond)', fontSize:11,
              letterSpacing:'0.10em', color:'var(--ink-4)', textTransform:'uppercase' }}>
              Select an option above to continue
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
