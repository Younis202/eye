'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCases } from '@/lib/api'
import { ScanLine, AlertTriangle, Clock, ChevronRight, Filter } from 'lucide-react'

const DR_COLORS  = ['#10B981','#F59E0B','#F97316','#EF4444','#9F1239']
const DR_LABELS  = ['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','PDR']
const DR_CLASSES = ['g0','g1','g2','g3','g4']

function urgencyOf(grade: number) {
  if (grade>=4) return {label:'Critical',cls:'u-urgent',priority:0}
  if (grade>=3) return {label:'Urgent',cls:'u-urgent',priority:1}
  if (grade>=2) return {label:'Priority',cls:'u-priority',priority:2}
  return {label:'Routine',cls:'u-routine',priority:3}
}

export default function TriagePage() {
  const [cases,  setCases]  = useState<any[]>([])
  const [loading,setLoading]= useState(true)
  const [filter, setFilter] = useState<string|null>(null)

  useEffect(()=>{
    getCases({ limit:100, refer_only:true })
      .then(d=>setCases((d.cases||d).sort((a:any,b:any)=>b.dr_grade-a.dr_grade)))
      .finally(()=>setLoading(false))
  },[])

  const filtered = filter ? cases.filter(c=>urgencyOf(c.dr_grade).label.toLowerCase()===filter) : cases

  const counts = {
    critical: cases.filter(c=>c.dr_grade>=4).length,
    urgent:   cases.filter(c=>c.dr_grade===3).length,
    priority: cases.filter(c=>c.dr_grade===2).length,
  }

  return (
    <div className="page">
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }} className="anim-up">
        <div>
          <div className="page-title">Triage<br/><span>Queue</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>{cases.length} cases requiring attention · Sorted by urgency</div>
        </div>
        <Link href="/analyze"><button className="btn btn-primary"><ScanLine size={14}/> New Scan</button></Link>
      </div>

      {/* Urgency summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }} className="anim-up-1">
        {[
          { key:'critical', label:'Critical — PDR', color:'var(--red)',   count:counts.critical },
          { key:'urgent',   label:'Urgent — Severe',color:'#F97316',      count:counts.urgent },
          { key:'priority', label:'Priority — Moderate',color:'var(--amber)',count:counts.priority },
        ].map(({ key,label,color,count })=>(
          <button key={key} onClick={()=>setFilter(filter===key?null:key)}
            style={{ background:filter===key?`${color}12`:'var(--surface)', border:`1px solid ${filter===key?color:'var(--border)'}`, borderRadius:'var(--r-xl)', padding:'18px 20px', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:40, color, lineHeight:1 }}>{count}</div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)', marginTop:4 }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="card anim-up-2" style={{ overflow:'hidden' }}>
        <div className="card-head">
          <span className="card-title">Referral Queue — {filtered.length} cases</span>
          {filter&&<button onClick={()=>setFilter(null)} className="btn btn-ghost btn-xs">Clear filter</button>}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Priority</th><th>Case</th><th>Patient</th><th>Grade</th><th>Since</th><th>Confidence</th><th>Action</th></tr></thead>
            <tbody>
              {loading&&[...Array(5)].map((_,i)=><tr key={i}>{[...Array(7)].map((_,j)=><td key={j}><div style={{ height:10,background:'var(--surface-2)',borderRadius:4 }}/></td>)}</tr>)}
              {!loading&&filtered.length===0&&<tr><td colSpan={7}><div className="empty"><div className="empty-title">Queue clear</div><div className="empty-sub">No referral cases in this category</div></div></td></tr>}
              {!loading&&filtered.map((c:any,i:number)=>{
                const urg=urgencyOf(c.dr_grade)
                return (
                  <tr key={c.id}>
                    <td><span className={`status-chip ${urg.cls}`}>{urg.label}</span></td>
                    <td><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.id?.slice(0,8)}</span></td>
                    <td style={{ fontWeight:600,color:'var(--ink)' }}>{c.patient_id}</td>
                    <td><span className={`grade-badge ${DR_CLASSES[c.dr_grade]||'g0'}`}><span className="gn">{c.dr_grade}</span>{DR_LABELS[c.dr_grade]}</span></td>
                    <td><div style={{ display:'flex',alignItems:'center',gap:5 }}><Clock size={11} style={{ color:'var(--ink-4)' }}/><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.created_at?.slice(0,10)}</span></div></td>
                    <td><span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:DR_COLORS[c.dr_grade] }}>{((c.dr_confidence||0)*100).toFixed(0)}%</span></td>
                    <td style={{ display:'flex',gap:6,alignItems:'center' }}>
                      <Link href={`/reports?case=${c.id}`}><button className="btn btn-outline btn-xs"><ChevronRight size={10}/> Review</button></Link>
                      <Link href={`/referrals`}><button className="btn btn-primary btn-xs"><ArrowLeftRight size={10}/> Refer</button></Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ArrowLeftRight({ size, ...props }: any) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 8h8M10 5l3 3-3 3M12 8H4M6 5L3 8l3 3"/></svg>
}
