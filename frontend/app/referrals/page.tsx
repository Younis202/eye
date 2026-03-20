'use client'
import { useEffect, useState } from 'react'
import { getReferrals, getReferralStats, createReferral, updateReferral, getCases } from '@/lib/api'
import toast from 'react-hot-toast'
import { ChevronRight, Plus, X } from 'lucide-react'

const STATUSES = ['pending','sent','acknowledged','seen','completed','cancelled']
const URGENCY  = ['urgent','priority','routine']
const STATUS_COLORS: Record<string,string> = {
  pending:'var(--amber)',sent:'var(--blue)',acknowledged:'#7C3AED',
  seen:'#EA580C',completed:'var(--green)',cancelled:'var(--ink-4)',
}

export default function ReferralsPage() {
  const [refs,    setRefs]    = useState<any[]>([])
  const [stats,   setStats]   = useState<any>(null)
  const [cases,   setCases]   = useState<any[]>([])
  const [statusF, setStatusF] = useState<string|null>(null)
  const [mode,    setMode]    = useState<'list'|'create'>('list')
  const [form,    setForm]    = useState({ case_id:'',patient_id:'',referring_dr:'',specialist:'',clinic:'',reason:'',urgency:'routine',notes:'' })
  const [loading, setLoading] = useState(false)
  const [expanded,setExpanded]= useState<string|null>(null)

  const load = () => {
    getReferrals({ status:statusF||undefined }).then(d=>setRefs(d.referrals||[]))
    getReferralStats().then(setStats)
  }
  useEffect(()=>{ load(); getCases({limit:100}).then(d=>setCases(d.cases||d)) },[statusF])

  const submit = async () => {
    if (!form.case_id||!form.specialist) return toast.error('Fill case ID and specialist')
    setLoading(true)
    try {
      await createReferral(form); toast.success('Referral created')
      setMode('list'); load()
      setForm({case_id:'',patient_id:'',referring_dr:'',specialist:'',clinic:'',reason:'',urgency:'routine',notes:''})
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }
  const advance = async (id:string, status:string) => {
    const idx=STATUSES.indexOf(status); const next=STATUSES[idx+1]
    if(!next||next==='cancelled')return
    await updateReferral(id,{status:next}); toast.success(`→ ${next}`); load()
  }
  const cancel = async (id:string) => {
    await updateReferral(id,{status:'cancelled'}); toast.success('Cancelled'); load()
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div className="page-title">Referral<br/><span>Pipeline</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>{stats?.total||0} total · {stats?.urgent_open||0} urgent open</div>
        </div>
        <button className={`btn ${mode==='create'?'btn-outline':'btn-primary'}`} onClick={()=>setMode(m=>m==='create'?'list':'create')}>
          {mode==='create'?<><X size={14}/> Cancel</>:<><Plus size={14}/> New Referral</>}
        </button>
      </div>

      {/* Status filter pills */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {STATUSES.map(s=>{
          const count=stats?.by_status?.[s]||0
          const active=statusF===s
          return (
            <button key={s} onClick={()=>setStatusF(active?null:s)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px',
                borderRadius:'var(--r-sm)', border:`1px solid ${active?STATUS_COLORS[s]:' var(--border)'}`,
                background:active?`${STATUS_COLORS[s]}10`:'var(--white)', cursor:'pointer', transition:'all 0.15s' }}>
              <span style={{ fontFamily:'var(--f-display)', fontSize:24, color:active?STATUS_COLORS[s]:'var(--ink)', lineHeight:1 }}>{count}</span>
              <span style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:active?STATUS_COLORS[s]:'var(--ink-4)' }}>{s}</span>
            </button>
          )
        })}
      </div>

      {/* Urgent alert */}
      {(stats?.urgent_open||0)>0 && (
        <div style={{ padding:'12px 16px', background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)',
          borderRadius:'var(--r-md)', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse-dot 1.5s ease-in-out infinite' }}/>
          <span style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, color:'var(--red)', letterSpacing:'0.04em' }}>
            {stats.urgent_open} urgent referral{stats.urgent_open>1?'s':''} require immediate action
          </span>
        </div>
      )}

      {mode==='create' ? (
        <div className="card" style={{ maxWidth:640 }}>
          <div className="card-head"><span className="card-title">New Referral</span></div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="field-label">Case ID *</label>
                <select className="field" value={form.case_id} onChange={e=>{
                  const c=cases.find(x=>x.id===e.target.value)
                  setForm(f=>({...f,case_id:e.target.value,patient_id:c?.patient_id||''}))
                }}>
                  <option value="">Select case…</option>
                  {cases.map(c=><option key={c.id} value={c.id}>{c.patient_id} — {c.id?.slice(0,8)} (G{c.dr_grade})</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Patient ID</label>
                <input className="field" value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))} placeholder="Auto-filled"/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="field-label">Referring Doctor</label>
                <input className="field" value={form.referring_dr} onChange={e=>setForm(f=>({...f,referring_dr:e.target.value}))} placeholder="Dr. Ahmed"/>
              </div>
              <div>
                <label className="field-label">Specialist *</label>
                <input className="field" value={form.specialist} onChange={e=>setForm(f=>({...f,specialist:e.target.value}))} placeholder="Retina specialist"/>
              </div>
            </div>
            <div>
              <label className="field-label">Clinic / Hospital</label>
              <input className="field" value={form.clinic} onChange={e=>setForm(f=>({...f,clinic:e.target.value}))} placeholder="Cairo Eye Center"/>
            </div>
            <div>
              <label className="field-label">Urgency</label>
              <div style={{ display:'flex', gap:8 }}>
                {URGENCY.map(u=>(
                  <button key={u} onClick={()=>setForm(f=>({...f,urgency:u}))}
                    className={form.urgency===u?'btn btn-green btn-sm':'btn btn-ghost btn-sm'}
                    style={{ flex:1, justifyContent:'center',
                      color:form.urgency===u?undefined:u==='urgent'?'var(--red)':u==='priority'?'var(--amber)':'var(--green-mid)' }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Clinical Reason</label>
              <textarea className="field" rows={3} style={{ resize:'none' }}
                value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}
                placeholder="Moderate DR with microaneurysms detected…"/>
            </div>
            <button className="btn btn-green btn-lg" style={{ justifyContent:'center' }} onClick={submit} disabled={loading}>
              {loading?'Creating…':'Create Referral'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {refs.length===0&&(
            <div className="empty">
              <div className="empty-icon"><span style={{ fontSize:22 }}>⇆</span></div>
              <div className="empty-title">No referrals</div>
              <div className="empty-sub">Create a referral from any scan result</div>
            </div>
          )}
          {refs.map(r=>{
            const stIdx=STATUSES.indexOf(r.status)
            const isOpen=expanded===r.id
            return (
              <div key={r.id} className="card" style={{ overflow:'hidden' }}>
                {/* Top urgency line */}
                <div style={{ height:3, background:r.urgency==='urgent'?'var(--red)':r.urgency==='priority'?'var(--amber)':'var(--green)', opacity:0.7 }}/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:0 }}>
                  {/* Main content */}
                  <div style={{ padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span className={`status-chip s-${r.status}`}>{r.status}</span>
                      <span className={`status-chip u-${r.urgency}`}>{r.urgency}</span>
                      <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginLeft:'auto' }}>{r.created_at?.slice(0,10)}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:4 }}>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:16, fontWeight:700, color:'var(--ink)' }}>{r.specialist}</div>
                      {r.clinic&&<div style={{ fontSize:12, color:'var(--ink-4)' }}>{r.clinic}</div>}
                    </div>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>
                      Patient: {r.patient_id} · Case: {r.case_id?.slice(0,8)}
                      {r.dr_grade!==null&&` · Grade ${r.dr_grade}`}
                    </div>
                    {r.reason&&<div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6, lineHeight:1.5 }}>{r.reason}</div>}
                    {r.outcome&&<div style={{ fontSize:11, color:'var(--green-mid)', marginTop:6, fontFamily:'var(--f-mono)' }}>Outcome: {r.outcome}</div>}
                  </div>

                  {/* Status pipeline + actions */}
                  <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8,
                    borderLeft:'1px solid var(--border)', minWidth:200 }}>
                    {/* Mini pipeline dots */}
                    <div style={{ display:'flex', gap:3 }}>
                      {STATUSES.slice(0,-1).map((s,i)=>{
                        const done=i<stIdx; const active=i===stIdx
                        return (
                          <div key={s} style={{ width:28, height:4, borderRadius:2, transition:'background 0.3s',
                            background:r.status==='cancelled'?'var(--border)':done?'var(--green)':active?STATUS_COLORS[r.status]:'var(--border)',
                            opacity:r.status==='cancelled'?0.3:1 }}/>
                        )
                      })}
                    </div>
                    {!['completed','cancelled'].includes(r.status)&&(
                      <>
                        <button className="btn btn-green btn-sm" style={{ width:'100%', justifyContent:'center' }}
                          onClick={()=>advance(r.id,r.status)}>
                          <ChevronRight size={13}/> Mark Next
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center' }}
                          onClick={()=>cancel(r.id)}>
                          Cancel
                        </button>
                      </>
                    )}
                    {r.status==='completed'&&(
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, color:'var(--green-mid)', letterSpacing:'0.06em' }}>✓ Complete</div>
                    )}
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginTop:'auto' }}>{r.id?.slice(0,12)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
