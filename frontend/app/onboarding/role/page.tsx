'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile, ROLE_META, UserRole } from '@/lib/auth'
import { Stethoscope, Building2, Globe, Check, ArrowRight, Eye } from 'lucide-react'

const ROLE_ICONS = { clinic: Stethoscope, hospital: Building2, ministry: Globe }
const ROLE_IDS: UserRole[] = ['clinic', 'hospital', 'ministry']

export default function RolePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<UserRole | null>(null)

  const choose = (role: UserRole) => {
    setSelected(role)
    setTimeout(() => { saveProfile({ role }); router.push('/onboarding/register') }, 200)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ padding:'24px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7C3AED,#5B21B6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Eye size={18} color="#fff" strokeWidth={2}/>
          </div>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:22, letterSpacing:'0.05em', color:'var(--ink)', lineHeight:1 }}>
              RETINA<span style={{ color:'#7C3AED' }}>GPT</span>
            </div>
            <div style={{ fontFamily:'var(--f-mono)', fontSize:8, color:'var(--ink-4)', letterSpacing:'0.14em', marginTop:2 }}>AI OPHTHALMOLOGY PLATFORM v6</div>
          </div>
        </div>
        <button onClick={()=>router.push('/dashboard')}
          style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--ink-3)', background:'none', border:'1px solid var(--border-2)', borderRadius:'var(--r-pill)', padding:'7px 18px', cursor:'pointer' }}>
          Sign in
        </button>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>

        {/* Heading */}
        <div style={{ textAlign:'center', marginBottom:48, maxWidth:560 }} className="anim-up">
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:20, padding:'5px 16px', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:'var(--r-pill)' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#7C3AED', animation:'pulse-dot 2s ease-in-out infinite' }}/>
            <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'#7C3AED' }}>Choose your workspace</span>
          </div>
          <div style={{ fontFamily:'var(--f-display)', fontSize:52, letterSpacing:'0.02em', color:'var(--ink)', lineHeight:1.05, marginBottom:14 }}>
            Who are you<br/>working as?
          </div>
          <div style={{ fontSize:15, color:'var(--ink-3)', lineHeight:1.65 }}>
            RetinaGPT configures a completely separate system for each role —<br/>
            tailored flows, pipelines and dashboards.
          </div>
        </div>

        {/* Role cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, width:'100%', maxWidth:960 }} className="anim-up-1">
          {ROLE_IDS.map((id, idx) => {
            const meta = ROLE_META[id]
            const Icon = ROLE_ICONS[id]
            const isSelected = selected === id
            return (
              <button key={id} onClick={() => choose(id)}
                style={{
                  background: isSelected ? meta.bg : '#FFFFFF',
                  border: `2px solid ${isSelected ? meta.color : 'rgba(124,58,237,0.10)'}`,
                  borderRadius:24, padding:'28px 24px',
                  cursor:'pointer', textAlign:'left',
                  transition:'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isSelected ? 'translateY(-5px)' : 'none',
                  boxShadow: isSelected
                    ? `0 20px 48px ${meta.dim}, 0 0 0 4px ${meta.dim}`
                    : '0 2px 8px rgba(109,40,217,0.06)',
                  display:'flex', flexDirection:'column', gap:22,
                  position:'relative', overflow:'hidden',
                }}>

                {/* Glow orb when selected */}
                {isSelected && (
                  <div style={{ position:'absolute', top:-60, right:-60, width:180, height:180,
                    background:`radial-gradient(circle, ${meta.dim} 0%, transparent 70%)`,
                    borderRadius:'50%', pointerEvents:'none' }}/>
                )}

                {/* Header */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:isSelected?meta.color:`${meta.color}14`,
                    border:`1px solid ${meta.border}`, display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.2s' }}>
                    <Icon size={22} strokeWidth={isSelected?2:1.8} style={{ color:isSelected?'#fff':meta.color }}/>
                  </div>
                  {isSelected && (
                    <div style={{ width:28, height:28, borderRadius:'50%', background:meta.color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'fade-up 0.18s ease' }}>
                      <Check size={14} color="#fff" strokeWidth={2.5}/>
                    </div>
                  )}
                </div>

                {/* Title + sub */}
                <div>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:18, fontWeight:700, letterSpacing:'0.02em',
                    color:isSelected ? meta.color : 'var(--ink)', marginBottom:5, transition:'color 0.18s' }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize:12, color:'var(--ink-4)', lineHeight:1.5, marginBottom:8 }}>{meta.sub}</div>
                  <div style={{ fontSize:12.5, color:'var(--ink-3)', lineHeight:1.65 }}>{meta.description}</div>
                </div>

                {/* Feature list */}
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {meta.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%',
                        background:isSelected?meta.color:'rgba(5,150,105,0.12)',
                        border:`1px solid ${isSelected?meta.color:'rgba(5,150,105,0.2)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, marginTop:1, transition:'all 0.18s' }}>
                        <Check size={8} color={isSelected?'#fff':'#059669'} strokeWidth={2.5}/>
                      </div>
                      <span style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  paddingTop:16, borderTop:`1px solid ${isSelected?meta.border:'var(--border)'}`,
                  transition:'border-color 0.18s' }}>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700,
                    letterSpacing:'0.08em', textTransform:'uppercase',
                    color:isSelected?meta.color:'var(--ink-4)', transition:'color 0.18s' }}>
                    {isSelected ? 'Setting up…' : 'Select workspace'}
                  </span>
                  <ArrowRight size={16} style={{ color:isSelected?meta.color:'var(--ink-5)',
                    transition:'all 0.18s', transform:isSelected?'translateX(4px)':'none' }}/>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{ marginTop:36, fontSize:13, color:'var(--ink-4)', textAlign:'center' }} className="anim-up-2">
          Each workspace has its own completely separate system, flows and AI pipeline.
        </div>
      </div>
    </div>
  )
}
