'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, saveProfile, ROLE_META, UserRole } from '@/lib/auth'
import { ArrowLeft, Eye, EyeOff, Stethoscope, Building2, Globe, Check, ChevronRight } from 'lucide-react'

const SPECIALTIES = [
  'Ophthalmologist – General', 'Retinal Specialist', 'Glaucoma Specialist',
  'Paediatric Ophthalmologist', 'Cornea Specialist', 'Oculoplastics', 'Neuro-Ophthalmologist',
]
const COUNTRIES = [
  'Egypt','Saudi Arabia','UAE','Jordan','Kuwait','Qatar','Bahrain','Oman',
  'Iraq','Lebanon','Libya','Morocco','Tunisia','Algeria','Sudan',
  'United Kingdom','United States','Germany','France','Canada','Australia',
]
const ROLE_ICONS: Record<string, any> = { clinic: Stethoscope, hospital: Building2, ministry: Globe }
const STEPS = ['Role','Account','Organisation','Ready']

export default function RegisterPage() {
  const router  = useRouter()
  const profile = getProfile()
  const role    = (profile?.role || 'clinic') as UserRole
  const meta    = ROLE_META[role]
  const Icon    = ROLE_ICONS[role]
  const [step,   setStep]   = useState<1 | 2>(1)
  const [show,   setShow]   = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form,   setForm]   = useState({
    doctorName:'', specialty:'', licenseNo:'', email:'', password:'', orgName:'', country:'', orgType:'',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const v1 = () => {
    const e: Record<string, string> = {}
    if (!form.doctorName.trim()) e.doctorName = 'Required'
    if (!form.specialty) e.specialty = 'Required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    if (form.password.length < 6) e.password = 'Minimum 6 characters'
    setErrors(e); return Object.keys(e).length === 0
  }
  const v2 = () => {
    const e: Record<string, string> = {}
    if (!form.orgName.trim()) e.orgName = 'Required'
    if (!form.country) e.country = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }
  const next   = () => { if (v1()) setStep(2) }
  const submit = () => { if (!v2()) return; saveProfile({ ...form, role, setupDone: false } as any); router.push('/onboarding/org') }

  const Field = ({ label, name, type = 'text', placeholder = '', options }: any) => (
    <div>
      <label className="field-label">{label}</label>
      {options ? (
        <select className="field" value={form[name as keyof typeof form]} onChange={e => set(name, e.target.value)}>
          <option value="">Select…</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div style={{ position:'relative' }}>
          <input className="field" type={name === 'password' && !show ? 'password' : type}
            placeholder={placeholder}
            value={form[name as keyof typeof form]} onChange={e => set(name, e.target.value)}/>
          {name === 'password' && (
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)',
                display:'flex', alignItems:'center' }}>
              {show ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          )}
        </div>
      )}
      {errors[name] && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{errors[name]}</div>}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex' }}>

      {/* LEFT — dark sidebar */}
      <div style={{ width:300, flexShrink:0, background:'linear-gradient(160deg,#3B0D8F 0%,#1E0557 50%,#120334 100%)',
        display:'flex', flexDirection:'column', padding:'40px 32px', position:'relative', overflow:'hidden' }}>

        {/* Decorative orbs */}
        <div style={{ position:'absolute', top:-80, right:-80, width:240, height:240, borderRadius:'50%',
          background:'rgba(167,139,250,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:-60, width:180, height:180, borderRadius:'50%',
          background:'rgba(167,139,250,0.05)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:44 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.10)',
            border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Eye size={17} color="#C4B5FD" strokeWidth={2}/>
          </div>
          <div style={{ fontFamily:'var(--f-display)', fontSize:20, letterSpacing:'0.05em', color:'#fff', lineHeight:1 }}>
            RETINA<span style={{ color:'#C4B5FD' }}>GPT</span>
          </div>
        </div>

        {/* Selected role */}
        <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:14, padding:16, marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,0.10)',
              border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={18} strokeWidth={1.8} color="#C4B5FD"/>
            </div>
            <div>
              <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, color:'#fff', letterSpacing:'0.02em' }}>{meta.label}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:1 }}>{meta.sub}</div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.18em',
          textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginBottom:16 }}>
          Setup progress
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {STEPS.map((s, i) => {
            const done   = i === 0 || (i === 1 && step === 2)
            const active = (i === 1 && step === 1) || (i === 2 && step === 2)
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:18, position:'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position:'absolute', left:11, top:24, bottom:0, width:1, background:'rgba(255,255,255,0.10)' }}/>
                )}
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, zIndex:1,
                  background: done ? '#7C3AED' : active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${done ? '#7C3AED' : active ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.10)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {done
                    ? <Check size={11} color="#fff" strokeWidth={2.5}/>
                    : <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:active?'#fff':'rgba(255,255,255,0.30)', fontWeight:700 }}>{i+1}</span>}
                </div>
                <span style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:active ? 700 : 400,
                  color: done ? '#C4B5FD' : active ? '#fff' : 'rgba(255,255,255,0.30)' }}>
                  {s}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT — form */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 64px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <button onClick={() => step === 1 ? router.back() : setStep(1)}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none',
              color:'var(--ink-3)', cursor:'pointer', fontFamily:'var(--f-cond)', fontSize:12,
              letterSpacing:'0.06em', marginBottom:32, padding:0, textTransform:'uppercase' }}>
            <ArrowLeft size={14}/> Back
          </button>

          {step === 1 ? (
            <>
              <div style={{ fontFamily:'var(--f-display)', fontSize:36, letterSpacing:'0.02em',
                color:'var(--ink)', lineHeight:1, marginBottom:6 }}>Your credentials</div>
              <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:28, lineHeight:1.6 }}>
                Personal details and login for the primary account holder.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="Full name"         name="doctorName" placeholder="Dr. Ahmed Mostafa"/>
                <Field label="Medical specialty" name="specialty"  options={SPECIALTIES}/>
                <Field label="Licence number"    name="licenseNo"  placeholder="EGY-OPH-12345"/>
                <div style={{ height:1, background:'var(--border)', margin:'2px 0' }}/>
                <Field label="Email address" name="email"    type="email"    placeholder="doctor@hospital.com"/>
                <Field label="Password"      name="password" type="password" placeholder="Minimum 6 characters"/>
              </div>
              <button className="btn btn-primary btn-lg" onClick={next}
                style={{ width:'100%', justifyContent:'center', marginTop:24,
                  background:meta.color, borderColor:meta.color }}>
                Continue <ChevronRight size={15}/>
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily:'var(--f-display)', fontSize:36, letterSpacing:'0.02em',
                color:'var(--ink)', lineHeight:1, marginBottom:6 }}>
                {role === 'clinic' ? 'Your clinic' : role === 'hospital' ? 'Your hospital' : 'Your authority'}
              </div>
              <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:28, lineHeight:1.6 }}>
                {role === 'clinic' ? 'Clinic details for records and PDF report headers.'
                  : role === 'hospital' ? 'Department and hospital information.'
                  : 'Ministry or health authority details.'}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label={role==='clinic'?'Clinic name':role==='hospital'?'Hospital name':'Authority name'}
                  name="orgName"
                  placeholder={role==='clinic'?'Cairo Eye Clinic':role==='hospital'?'Kasr El Aini Eye Dept.':'Ministry of Health – Egypt'}/>
                <Field label="Country" name="country" options={COUNTRIES}/>
                {role === 'hospital' && (
                  <div>
                    <label className="field-label">Hospital type</label>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                      {['University','Government','Private','Military'].map(t => (
                        <button key={t} onClick={() => set('orgType', t)}
                          style={{ padding:'7px 16px', borderRadius:'var(--r-md)',
                            border:`1.5px solid ${form.orgType===t?meta.color:'var(--border-2)'}`,
                            background: form.orgType===t ? meta.dim : 'var(--surface)',
                            color: form.orgType===t ? meta.color : 'var(--ink-3)',
                            fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700,
                            cursor:'pointer', letterSpacing:'0.06em', transition:'all 0.15s' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="btn btn-primary btn-lg" onClick={submit}
                style={{ width:'100%', justifyContent:'center', marginTop:24,
                  background:meta.color, borderColor:meta.color }}>
                Create account <ChevronRight size={15}/>
              </button>
            </>
          )}

          <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'var(--ink-4)' }}>
            By continuing you agree to our{' '}
            <span style={{ color:meta.color, cursor:'pointer', fontWeight:600 }}>Terms</span>
            {' '}and{' '}
            <span style={{ color:meta.color, cursor:'pointer', fontWeight:600 }}>Privacy Policy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
