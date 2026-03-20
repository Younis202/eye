'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCases, getProgression } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const DR_LABELS = ['No DR','Mild','Moderate','Severe','PDR']
const DR_COLORS = ['#059669','#D97706','#EA580C','#DC2626','#9F1239']
const DR_BG     = ['#ECFDF5','#FFFBEB','#FFF7ED','#FEF2F2','#FFF1F2']

export default function ProgressionPage() {
  const params   = useSearchParams()
  const [patients,setPatients]=useState<string[]>([])
  const [selPat,setSelPat]   =useState(params.get('patient')||'')
  const [scans,setScans]     =useState<any[]>([])
  const [prog,setProg]       =useState<any>(null)
  const [loading,setLoading] =useState(false)

  useEffect(()=>{
    getCases({limit:200}).then(d=>{
      const c=d.cases||d
      const pids=[...new Set(c.map((x:any)=>x.patient_id))] as string[]
      setPatients(pids)
      if(!selPat&&pids.length)setSelPat(pids[0])
    })
  },[])

  useEffect(()=>{
    if(!selPat)return
    setLoading(true)
    getCases({patient_id:selPat,limit:50}).then(d=>setScans((d.cases||d).reverse()))
    getProgression(selPat).then(setProg).catch(()=>{})
    setTimeout(()=>setLoading(false),600)
  },[selPat])

  const chartData=scans.map((s,i)=>({
    visit:i+1, date:s.created_at?.slice(0,10),
    grade:s.dr_grade??0, conf:Math.round((s.dr_confidence||0)*100),
  }))
  const latest=scans[scans.length-1]; const first=scans[0]
  const trend=latest&&first?latest.dr_grade-first.dr_grade:0

  const CustomDot=(props:any)=>{
    const{cx,cy,payload}=props
    return <circle cx={cx} cy={cy} r={6} fill={DR_COLORS[payload.grade]} stroke="#fff" strokeWidth={2}/>
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div className="page-title">Disease<br/><span>Progression</span></div>
        <div className="page-subtitle" style={{ marginTop:6 }}>Longitudinal DR tracking · Risk modelling · Timeline analysis</div>
      </div>

      {/* Patient selector */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {patients.map(pid=>(
          <button key={pid} className={selPat===pid?'btn btn-green':'btn btn-outline btn-sm'}
            onClick={()=>setSelPat(pid)}>{pid}</button>
        ))}
        {patients.length===0&&(
          <div className="empty">
            <div className="empty-icon"><TrendingUp size={22} strokeWidth={1.5}/></div>
            <div className="empty-title">No patients yet</div>
            <div className="empty-sub">Upload retinal scans to track progression</div>
          </div>
        )}
      </div>

      {selPat&&scans.length>0&&(
        <>
          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            <div className="stat-tile lime anim-up">
              <div className="stat-tile-accent"/>
              <div className="stat-val">{scans.length}</div>
              <div className="stat-label">Total Visits</div>
            </div>
            <div className={`stat-tile ${trend>0?'red':trend<0?'lime':'blue'} anim-up-1`}>
              <div className="stat-tile-accent"/>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                {trend>0?<TrendingUp size={18} color="var(--red)"/>:trend<0?<TrendingDown size={18} color="var(--green)"/>:<Minus size={18} color="var(--blue)"/>}
              </div>
              <div className="stat-val" style={{ fontSize:40 }}>{trend>0?`+${trend}`:trend<0?trend:'0'}</div>
              <div className="stat-label">Grade Change</div>
              <div className={`stat-delta ${trend>0?'delta-dn':'delta-up'}`}>
                {trend>0?'↑ Worsening':trend<0?'↓ Improving':'→ Stable'}
              </div>
            </div>
            <div className="stat-tile blue anim-up-2">
              <div className="stat-tile-accent"/>
              <div className="stat-val" style={{ fontSize:40, color:'var(--blue)' }}>
                {Math.round((prog?.risk_12m||0)*100)}%
              </div>
              <div className="stat-label">12-Month Risk</div>
            </div>
            <div className={`stat-tile ${latest?.dr_refer?'red':'lime'} anim-up-3`}>
              <div className="stat-tile-accent"/>
              {latest?.dr_refer&&<div style={{ marginBottom:4 }}><AlertTriangle size={18} color="var(--red)"/></div>}
              <div className="stat-val" style={{ fontSize:28 }}>{latest?.dr_refer?'Refer':'Monitor'}</div>
              <div className="stat-label">Current Action</div>
            </div>
          </div>

          {/* Chart */}
          <div className="card anim-up-2" style={{ marginBottom:20 }}>
            <div className="card-head">
              <span className="card-title">DR Grade Over Time — {selPat}</span>
              <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>
                {scans[0]?.created_at?.slice(0,10)} → {scans[scans.length-1]?.created_at?.slice(0,10)}
              </span>
            </div>
            <div style={{ padding:'24px 20px 12px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontFamily:'var(--f-mono)',fontSize:9,fill:'var(--ink-4)' }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,4]} ticks={[0,1,2,3,4]}
                    tick={{ fontFamily:'var(--f-mono)',fontSize:9,fill:'var(--ink-4)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v:number)=>DR_LABELS[v]?.slice(0,4)||v}/>
                  <Tooltip contentStyle={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,fontFamily:'var(--f-body)',fontSize:12 }}
                    formatter={(val:any,name:string)=>[`${val}`,name==='grade'?'Grade':name]}
                    labelFormatter={(l:any)=>`Visit: ${l}`}/>
                  <ReferenceLine y={2} stroke="rgba(220,38,38,0.3)" strokeDasharray="4 4"
                    label={{ value:'Referral threshold',fill:'var(--red)',fontSize:9,fontFamily:'var(--f-mono)' }}/>
                  <Line type="monotone" dataKey="grade" stroke="var(--pl)" strokeWidth={2.5}
                    dot={<CustomDot/>} activeDot={{ r:8, fill:'var(--pl)' }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Grade legend */}
            <div style={{ padding:'0 20px 16px', display:'flex', gap:16, flexWrap:'wrap' }}>
              {DR_LABELS.map((l,i)=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:DR_COLORS[i] }}/>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>G{i} {l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visit timeline */}
          <div className="card anim-up-3">
            <div className="card-head"><span className="card-title">Visit Timeline</span></div>
            <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:0 }}>
              {scans.map((s,i)=>{
                const prev=scans[i-1]; const delta=prev?s.dr_grade-prev.dr_grade:null
                return (
                  <div key={s.id} style={{ display:'flex', gap:16, alignItems:'flex-start', position:'relative' }}>
                    {i<scans.length-1&&<div style={{ position:'absolute',left:10,top:24,bottom:0,width:1,background:'var(--border)' }}/>}
                    <div style={{ width:20,height:20,borderRadius:'50%',background:DR_COLORS[s.dr_grade],
                      border:'3px solid var(--white)',boxShadow:'var(--shadow-sm)',
                      flexShrink:0,marginTop:2,position:'relative',zIndex:1 }}/>
                    <div style={{ flex:1, paddingBottom:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.06em',color:'var(--ink-3)' }}>
                          {s.created_at?.slice(0,10)}
                        </span>
                        <span className={`grade-badge g${s.dr_grade}`}>
                          <span className="gn">{s.dr_grade}</span>{DR_LABELS[s.dr_grade]}
                        </span>
                        {delta!==null&&(
                          <span style={{ fontFamily:'var(--f-mono)',fontSize:10,padding:'1px 6px',borderRadius:4,
                            background:delta>0?'rgba(220,38,38,0.1)':delta<0?'rgba(0,200,83,0.1)':'var(--border-light)',
                            color:delta>0?'var(--red)':delta<0?'var(--green-mid)':'var(--ink-4)' }}>
                            {delta>0?'+':''}{delta} vs prev
                          </span>
                        )}
                        {s.dr_refer&&<span className="status-chip u-urgent">Refer</span>}
                      </div>
                      <div style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--ink-4)' }}>
                        {((s.dr_confidence||0)*100).toFixed(0)}% confidence · {s.image_name||'retinal scan'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
