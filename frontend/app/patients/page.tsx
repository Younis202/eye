'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCases } from '@/lib/api'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ScanLine, TrendingUp, FileText, Search, Filter,
  Plus, ChevronRight, User, Calendar, Activity,
  AlertTriangle, Clock, LayoutGrid, List, X, Edit3,
  Microscope, Heart, Droplets, Eye, Phone, Mail,
} from 'lucide-react'

const DR_COLORS  = ['#059669','#D97706','#EA580C','#DC2626','#9F1239']
const DR_LABELS  = ['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','PDR']
const DR_BG      = ['#ECFDF5','#FFFBEB','#FFF7ED','#FEF2F2','#FFF1F2']
const DR_CLASSES = ['g0','g1','g2','g3','g4']

function initials(name: string) { return (name || '??').split(' ').map((w:string) => w[0]).slice(0,2).join('').toUpperCase() }

// ── Patient Profile Modal ──────────────────────────────────────────────────
function PatientModal({ patient, scans, onClose }: { patient: any; scans: any[]; onClose: () => void }) {
  const grade   = scans[0]?.dr_grade ?? 0
  const conf    = ((scans[0]?.dr_confidence || 0) * 100).toFixed(0)
  const trend   = scans.length > 1 ? scans[0].dr_grade - scans[scans.length - 1].dr_grade : 0

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:860, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-xl)' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg, var(--pl) 0%, var(--pl-mid) 100%)', padding:'28px 32px', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={15}/>
          </button>
          <div style={{ display:'flex', alignItems:'flex-start', gap:18 }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'rgba(255,255,255,0.12)', border:'1.5px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'var(--f-display)', fontSize:24, color:'#fff' }}>{initials(patient.pid)}</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--f-display)', fontSize:28, letterSpacing:'0.03em', color:'#fff', lineHeight:1, marginBottom:6 }}>{patient.name || patient.pid}</div>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'rgba(255,255,255,0.55)', letterSpacing:'0.08em' }}>ID: {patient.pid}</div>
                {patient.age && <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'rgba(255,255,255,0.55)' }}>{patient.age} yrs · {patient.gender || 'Unknown'}</div>}
                {scans[0]?.dr_refer && <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', padding:'2px 10px', borderRadius:'var(--r-pill)', background:'rgba(255,68,68,0.25)', color:'#FF8080', border:'1px solid rgba(255,68,68,0.3)' }}>REFERRAL REQUIRED</span>}
              </div>
            </div>
            {/* Grade hero in header */}
            <div style={{ textAlign:'center', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 20px' }}>
              <div style={{ fontFamily:'var(--f-display)', fontSize:48, lineHeight:1, color: grade === 0 ? '#6EE7B7' : grade === 1 ? '#FDE68A' : grade === 2 ? '#FDBA74' : grade >= 3 ? '#FCA5A5' : '#fff' }}>{grade}</div>
              <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)', marginTop:3 }}>DR GRADE</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:0, height:'100%' }}>

            {/* LEFT — medical info */}
            <div style={{ borderRight:'1px solid var(--border)', padding:'24px 20px', background:'var(--surface-2)' }}>
              <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--ink-4)', marginBottom:14 }}>Clinical Info</div>

              {/* Diabetes */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Droplets size={12} style={{ color:'var(--blue)' }}/>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)' }}>Diabetes</span>
                </div>
                <div className="data-row" style={{ padding:'5px 0' }}>
                  <span className="data-label">Type</span>
                  <span className="data-value">{patient.diabetes_type || '—'}</span>
                </div>
                <div className="data-row" style={{ padding:'5px 0', borderBottom:'none' }}>
                  <span className="data-label">HbA1c</span>
                  <span className="data-value" style={{ color: (patient.hba1c||0)>8 ? 'var(--red)' : (patient.hba1c||0)>7 ? 'var(--amber)' : 'var(--green-mid)' }}>
                    {patient.hba1c ? `${patient.hba1c}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <User size={12} style={{ color:'var(--ink-3)' }}/>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)' }}>Contact</span>
                </div>
                {patient.phone && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <Phone size={11} style={{ color:'var(--ink-4)', flexShrink:0 }}/>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-2)' }}>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Mail size={11} style={{ color:'var(--ink-4)', flexShrink:0 }}/>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-2)' }}>{patient.email}</span>
                  </div>
                )}
                {!patient.phone && !patient.email && <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-4)' }}>No contact info</span>}
              </div>

              {/* Current findings */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Activity size={12} style={{ color:'var(--ink-3)' }}/>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)' }}>Latest Scan</span>
                </div>
                <div className="data-row" style={{ padding:'4px 0' }}>
                  <span className="data-label">Grade</span>
                  <span className={`grade-badge ${DR_CLASSES[grade]}`} style={{ fontSize:10 }}><span className="gn" style={{ fontSize:14 }}>{grade}</span>{DR_LABELS[grade]}</span>
                </div>
                <div className="data-row" style={{ padding:'4px 0' }}>
                  <span className="data-label">Confidence</span>
                  <span className="data-value">{conf}%</span>
                </div>
                <div className="data-row" style={{ padding:'4px 0', borderBottom:'none' }}>
                  <span className="data-label">Trend</span>
                  <span className="data-value" style={{ color: trend>0?'var(--red)':trend<0?'var(--green-mid)':'var(--ink-3)' }}>
                    {trend>0?`+${trend} worse`:trend<0?`${trend} better`:'Stable'}
                  </span>
                </div>
              </div>

              {patient.notes && (
                <div style={{ marginTop:10, padding:'10px 12px', background:'var(--amber-light)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8 }}>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--amber)', marginBottom:4 }}>Clinical Notes</div>
                  <div style={{ fontSize:11, color:'var(--ink-2)', lineHeight:1.55 }}>{patient.notes}</div>
                </div>
              )}
            </div>

            {/* RIGHT — scan history timeline */}
            <div style={{ padding:'24px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--ink-4)' }}>
                  Scan History — {scans.length} visits
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Link href={`/analyze`}><button className="btn btn-green btn-sm"><ScanLine size={12}/> New Scan</button></Link>
                  <Link href={`/progression?patient=${patient.pid}`}><button className="btn btn-outline btn-sm"><TrendingUp size={12}/> Progression</button></Link>
                </div>
              </div>

              {/* Scan sparkline */}
              {scans.length > 1 && (
                <div style={{ marginBottom:20, padding:'12px 14px', background:'var(--surface-2)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)', marginBottom:8 }}>DR Grade Trend</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:40 }}>
                    {scans.slice().reverse().map((s,i) => (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ width:'100%', borderRadius:3, background:DR_COLORS[s.dr_grade]||'var(--border)', transition:'height 0.3s',
                          height: `${Math.max(8,(s.dr_grade/4)*40)}px` }}/>
                        <span style={{ fontFamily:'var(--f-mono)', fontSize:7, color:'var(--ink-4)' }}>{s.created_at?.slice(5,10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {scans.map((s,i) => {
                  const prev = scans[i+1]; const delta = prev ? s.dr_grade - prev.dr_grade : null
                  return (
                    <div key={s.id} className="timeline-item" style={{ paddingBottom:16 }}>
                      {i < scans.length-1 && <div style={{ position:'absolute', left:9, top:20, bottom:0, width:1, background:'var(--border)' }}/>}
                      <div className="timeline-dot" style={{ background:DR_COLORS[s.dr_grade], marginTop:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>{s.created_at?.slice(0,10)}</span>
                          <span className={`grade-badge ${DR_CLASSES[s.dr_grade]||'g0'}`} style={{ fontSize:10, padding:'2px 8px 2px 5px' }}>
                            <span className="gn" style={{ fontSize:14 }}>{s.dr_grade}</span>{DR_LABELS[s.dr_grade]}
                          </span>
                          {delta !== null && (
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:9, padding:'1px 6px', borderRadius:4,
                              background:delta>0?'rgba(220,38,38,0.08)':delta<0?'rgba(0,168,68,0.08)':'var(--border-light)',
                              color:delta>0?'var(--red)':delta<0?'var(--green-mid)':'var(--ink-4)' }}>
                              {delta>0?'+':''}{delta} vs prev
                            </span>
                          )}
                          {s.dr_refer && <span className="status-chip u-urgent" style={{ fontSize:9, padding:'2px 8px' }}>Refer</span>}
                        </div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>
                            {((s.dr_confidence||0)*100).toFixed(0)}% confidence
                          </span>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>
                            Quality: {s.quality_adequate !== 0 ? '✓ OK' : '⚠ Low'}
                          </span>
                        </div>
                        <div style={{ marginTop:6, display:'flex', gap:8 }}>
                          <Link href={`/reports?case=${s.id}`}>
                            <button className="btn btn-ghost btn-sm" style={{ padding:'4px 10px', fontSize:10 }}>
                              <FileText size={11}/> Report
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const [cases,   setCases]   = useState<any[]>([])
  const [patients,setPatients]= useState<Record<string,any>>({})
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<number|null>(null)
  const [view,    setView]    = useState<'grid'|'list'>('grid')
  const [modal,   setModal]   = useState<string|null>(null)

  useEffect(()=>{
    Promise.all([
      getCases({ limit:200 }).then(d => d.cases||d),
      axios.get('/api/retina/patients').then(r => r.data.patients||[]).catch(()=>[]),
    ]).then(([c, p]) => {
      setCases(c)
      const pm: Record<string,any> = {}
      p.forEach((pt:any) => { pm[pt.patient_code||pt.id] = pt })
      setPatients(pm)
    }).finally(()=>setLoading(false))
  },[])

  const casesByPid: Record<string,any[]> = {}
  cases.forEach(c => {
    const pid = c.patient_id || 'Unknown'
    if (!casesByPid[pid]) casesByPid[pid] = []
    casesByPid[pid].push(c)
  })

  const pList = Object.entries(casesByPid).map(([pid, pScans]) => ({
    pid, scans: pScans,
    latest: pScans[0],
    total: pScans.length,
    name: patients[pid]?.name || pid,
    age: patients[pid]?.age,
    gender: patients[pid]?.gender,
    diabetes_type: patients[pid]?.diabetes_type,
    hba1c: patients[pid]?.hba1c,
    phone: patients[pid]?.phone,
    email: patients[pid]?.email,
    notes: patients[pid]?.notes,
  })).filter(p => {
    const ms = !search || p.pid.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
    const mg = filter===null || p.latest?.dr_grade === filter
    return ms && mg
  })

  const gradeCounts = [0,1,2,3,4].map(g => cases.filter(c=>c.dr_grade===g).length)
  const modalPat = modal ? pList.find(p=>p.pid===modal) : null

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }} className="anim-up">
        <div>
          <div className="page-title">Patient<br/><span>Records</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>{pList.length} patients · {cases.length} total scans</div>
        </div>
        <Link href="/analyze">
          <button className="btn btn-primary"><ScanLine size={14}/> New Scan</button>
        </Link>
      </div>

      {/* Grade filter bar */}
      {cases.length > 0 && (
        <div className="card anim-up-1" style={{ marginBottom:20, padding:0, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)' }}>
            {[0,1,2,3,4].map(g=>(
              <button key={g} onClick={()=>setFilter(filter===g?null:g)}
                style={{ padding:'14px 12px', textAlign:'center', cursor:'pointer', border:'none',
                  borderRight:g<4?'1px solid var(--border)':undefined,
                  background:filter===g?DR_BG[g]:'var(--white)', transition:'background 0.15s' }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:DR_COLORS[g], lineHeight:1 }}>{gradeCounts[g]}</div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:filter===g?DR_COLORS[g]:'var(--ink-4)', marginTop:3 }}>
                  Grade {g}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }} className="anim-up-1">
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
          <input className="field" style={{ paddingLeft:36 }} placeholder="Search by name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{ display:'flex', gap:4, background:'var(--bg)', borderRadius:8, padding:3 }}>
          {(['grid','list'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', transition:'all 0.15s',
                background:view===v?'var(--white)':undefined, boxShadow:view===v?'var(--shadow-xs)':undefined,
                color:view===v?'var(--ink-2)':'var(--ink-4)' }}>
              {v==='grid'?<LayoutGrid size={14}/>:<List size={14}/>}
            </button>
          ))}
        </div>
        {filter!==null&&(
          <button onClick={()=>setFilter(null)} className="btn btn-ghost btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
            <X size={12}/> Clear filter
          </button>
        )}
        <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)', marginLeft:'auto' }}>{pList.length} results</span>
      </div>

      {/* Grid view */}
      {!loading && view==='grid' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:14 }}>
          {pList.map(({ pid, scans, latest, total, name, age, gender, hba1c, diabetes_type }, idx) => {
            const grade = latest?.dr_grade ?? 0; const conf = ((latest?.dr_confidence||0)*100).toFixed(0)
            return (
              <div key={pid} className={`patient-card anim-up-${Math.min(idx%4+1,5)}`} onClick={()=>setModal(pid)}>
                <div className="patient-strip" style={{ background:`linear-gradient(90deg,${DR_COLORS[grade]},${DR_COLORS[grade]}88)` }}/>
                <div className="patient-body">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
                    <div className="patient-initials">{initials(name)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:14, fontWeight:700, color:'var(--ink)', letterSpacing:'0.02em' }}>{name}</div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)', marginTop:2 }}>
                        {pid} {age?`· ${age}y`:''}
                      </div>
                    </div>
                    {latest?.dr_refer&&<span className="status-chip u-urgent" style={{ fontSize:9 }}>Refer</span>}
                  </div>

                  {/* Grade pill */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:DR_BG[grade], borderRadius:8, marginBottom:12 }}>
                    <div style={{ fontFamily:'var(--f-display)', fontSize:32, color:DR_COLORS[grade], lineHeight:1 }}>{grade}</div>
                    <div>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, color:DR_COLORS[grade], letterSpacing:'0.04em' }}>{DR_LABELS[grade]}</div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-3)', marginTop:1 }}>{conf}% confidence</div>
                    </div>
                    {hba1c&&(
                      <div style={{ marginLeft:'auto', textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--f-mono)', fontSize:14, fontWeight:700, color:(hba1c)>8?'var(--red)':(hba1c)>7?'var(--amber)':'var(--green-mid)' }}>{hba1c}%</div>
                        <div style={{ fontFamily:'var(--f-mono)', fontSize:8, color:'var(--ink-4)' }}>HbA1c</div>
                      </div>
                    )}
                  </div>

                  {/* Mini history bars */}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:16, marginBottom:12 }}>
                    {scans.slice(0,10).map((s,i)=>(
                      <div key={i} style={{ flex:1, borderRadius:2, background:DR_COLORS[s.dr_grade]||'var(--border)', height:`${Math.max(4,(s.dr_grade/4)*16)}px`, opacity:i===0?1:Math.max(0.2,0.9-i*0.1) }}/>
                    ))}
                    {scans.length>10&&<div style={{ fontFamily:'var(--f-mono)', fontSize:7, color:'var(--ink-4)', alignSelf:'center', marginLeft:2 }}>+{scans.length-10}</div>}
                  </div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginBottom:12 }}>
                    {total} scan{total>1?'s':''} · Last: {latest?.created_at?.slice(0,10)}
                  </div>

                  <div style={{ display:'flex', gap:6 }}>
                    <Link href={`/progression?patient=${pid}`} style={{ flex:1 }} onClick={e=>e.stopPropagation()}>
                      <button className="btn btn-outline btn-sm" style={{ width:'100%', justifyContent:'center', fontSize:11 }}>
                        <TrendingUp size={11}/> Progression
                      </button>
                    </Link>
                    <button onClick={e=>{e.stopPropagation();setModal(pid)}} className="btn btn-ghost btn-sm">
                      <FileText size={11}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {!loading && view==='list' && (
        <div className="card anim-up-1" style={{ overflow:'hidden' }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th>#</th><th>Patient</th><th>Scans</th><th>Grade</th>
                <th>HbA1c</th><th>Last scan</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pList.map(({ pid, scans, latest, total, name, hba1c }, i) => {
                const grade=latest?.dr_grade??0
                const zone=grade>=3?'zone-danger':grade===2?'zone-warn':grade===1?'zone-gold':'zone-lime'
                return (
                  <tr key={pid} className={zone} style={{ cursor:'pointer' }} onClick={()=>setModal(pid)}>
                    <td className="rank">{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="patient-initials" style={{ width:30, height:30, fontSize:12 }}>{initials(name)}</div>
                        <div>
                          <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>{name}</div>
                          <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>{pid}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily:'var(--f-display)', fontSize:20, color:'var(--ink-3)' }}>{total}</span></td>
                    <td><span className={`grade-badge ${DR_CLASSES[grade]||'g0'}`}><span className="gn">{grade}</span>{DR_LABELS[grade]}</span></td>
                    <td>
                      {hba1c
                        ? <span style={{ fontFamily:'var(--f-mono)', fontSize:12, fontWeight:700, color:(hba1c)>8?'var(--red)':(hba1c)>7?'var(--amber)':'var(--green-mid)' }}>{hba1c}%</span>
                        : <span style={{ color:'var(--ink-4)', fontSize:12 }}>—</span>}
                    </td>
                    <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-3)' }}>{latest?.created_at?.slice(0,10)}</span></td>
                    <td>{latest?.dr_refer?<span className="status-chip u-urgent">Refer</span>:<span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>Monitor</span>}</td>
                    <td><ChevronRight size={14} style={{ color:'var(--ink-4)' }}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pList.length===0 && (
        <div className="empty">
          <div className="empty-icon"><User size={22} strokeWidth={1.5}/></div>
          <div className="empty-title">No patients found</div>
          <div className="empty-sub">Upload a retinal scan to register a patient automatically</div>
          <Link href="/analyze"><button className="btn btn-primary btn-sm" style={{ marginTop:8 }}><ScanLine size={13}/> Upload scan</button></Link>
        </div>
      )}

      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:14 }}>
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:200, borderRadius:'var(--r-xl)' }}/>)}
        </div>
      )}

      {/* Patient modal */}
      {modal && modalPat && (
        <PatientModal patient={modalPat} scans={modalPat.scans} onClose={()=>setModal(null)}/>
      )}
    </div>
  )
}
