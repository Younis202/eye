'use client'
import { useEffect, useState } from 'react'
import { AreaChart,Area,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell,PieChart,Pie } from 'recharts'
import axios from 'axios'
import { RefreshCw, Zap, Download, FileText } from 'lucide-react'

const BASE = '/api/retina'
const DR_COLORS = ['#059669','#D97706','#EA580C','#DC2626','#9F1239']
const DR_LABELS = ['No DR','Mild','Moderate','Severe','PDR']

function KpiCell({ val, label, color, i }: any) {
  return (
    <div style={{ background:'var(--surface)', padding:'28px 24px', borderRight:i<4?'1px solid var(--border)':'none', position:'relative', textAlign:'center' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.7, borderRadius:i===0?'var(--r-lg) 0 0 0':i===4?'0 var(--r-lg) 0 0':undefined }}/>
      <div style={{ fontFamily:'var(--f-display)', fontSize:56, letterSpacing:'0.02em', lineHeight:1, color }}>{val}</div>
      <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-4)', marginTop:8 }}>{label}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [ov,setOv]           =useState<any>(null)
  const [timeline,setTimeline]=useState<any[]>([])
  const [loading,setLoading] =useState(true)
  const [seeding,setSeeding] =useState(false)
  const [seedDone,setSeedDone]=useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      axios.get(`${BASE}/analytics/overview`).then(r=>r.data),
      axios.get(`${BASE}/analytics/timeline?days=30`).then(r=>r.data),
    ]).then(([o,t])=>{ setOv(o); setTimeline(t.data||[]) })
    .catch(()=>{}).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const seed = async () => {
    setSeeding(true)
    try { await axios.post(`${BASE}/demo/seed`); setSeedDone(true); setTimeout(()=>{ setSeedDone(false); load() },1500) }
    catch{} finally { setSeeding(false) }
  }

  const dist=ov?.dr_distribution||{}
  const distData=Object.entries(dist).map(([g,c])=>({ name:DR_LABELS[+g]||`G${g}`,value:c as number,color:DR_COLORS[+g]||'#888' }))
  const refStats=ov?.referral_stats||{}
  const refData=Object.entries(refStats.by_status||{}).map(([s,c])=>({ status:s, count:c }))
  const STATUS_COLORS: Record<string,string> = { pending:'var(--amber)',sent:'var(--blue)',acknowledged:'#7C3AED',seen:'#EA580C',completed:'var(--green)',cancelled:'var(--ink-4)' }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div className="page-title">National<br/><span style={{ color:'var(--amber)' }}>Analytics</span></div>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-4)', marginTop:8 }}>
            Ministry & Hospital intelligence · Real-time population health
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation:loading?'spin 0.9s linear infinite':undefined }}/> Refresh
          </button>
          <button className={`btn btn-sm ${seedDone?'btn-green':'btn-outline'}`} onClick={seed} disabled={seeding}>
            <Zap size={13}/> {seeding?'Seeding…':seedDone?'✓ Seeded!':'Load Demo Data'}
          </button>
        </div>
      </div>

      {/* KPI scoreboard */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:0, background:'var(--border)',
        border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:24, boxShadow:'var(--shadow-sm)' }}>
        {[
          {val:ov?.total_scans??'—',       label:'Total Scans',     color:'var(--ink)'},
          {val:ov?.scans_today??'—',        label:'Today',           color:'var(--green)'},
          {val:`${ov?.referable_rate_pct??0}%`, label:'Referable Rate', color:'var(--amber)'},
          {val:ov?.referable_cases??'—',    label:'Need Referral',   color:'var(--red)'},
          {val:`${ov?.screening_coverage_pct??0}%`, label:'Coverage', color:'var(--blue)'},
        ].map((k,i)=><KpiCell key={i} {...k} i={i}/>)}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
        {/* DR Distribution */}
        <div className="card">
          <div className="card-head"><span className="card-title">DR Grade Distribution</span></div>
          <div style={{ padding:'20px 16px' }}>
            {distData.length>0?(
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={distData} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontFamily:'var(--f-mono)',fontSize:8,fill:'var(--ink-4)' }} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,fontFamily:'var(--f-body)',fontSize:12 }} cursor={{ fill:'rgba(55,0,60,0.04)' }}/>
                    <Bar dataKey="value" radius={[4,4,0,0]}>
                      {distData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:12 }}>
                  {distData.map((d,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8,height:8,borderRadius:2,background:d.color,flexShrink:0 }}/>
                      <span style={{ fontFamily:'var(--f-cond)',fontSize:10,color:'var(--ink-3)',flex:1,textTransform:'uppercase',letterSpacing:'0.06em' }}>{d.name}</span>
                      <span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--ink-2)' }}>{d.value}</span>
                      <span style={{ fontFamily:'var(--f-mono)',fontSize:9,color:'var(--ink-4)' }}>{ov?.dr_distribution_pct?.[Object.keys(dist)[i]]||0}%</span>
                    </div>
                  ))}
                </div>
              </>
            ):(
              <div className="empty"><div className="empty-icon"><span style={{ fontSize:22 }}>📊</span></div><div className="empty-sub">No data · Load demo</div></div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <div className="card-head"><span className="card-title">30-Day Scan Volume</span></div>
          <div style={{ padding:'20px 16px' }}>
            {timeline.length>0?(
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--green)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--red)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--red)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontFamily:'var(--f-mono)',fontSize:8,fill:'var(--ink-4)' }} axisLine={false} tickLine={false} tickFormatter={(v:string)=>v?.slice(5)}/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,fontFamily:'var(--f-body)',fontSize:12 }}/>
                  <Area type="monotone" dataKey="scans" stroke="var(--green)" fill="url(#scanGrad)" strokeWidth={1.5} dot={false}/>
                  <Area type="monotone" dataKey="referable" stroke="var(--red)" fill="url(#refGrad)" strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            ):(
              <div className="empty"><div className="empty-icon"><span style={{ fontSize:22 }}>📈</span></div><div className="empty-sub">No timeline data</div></div>
            )}
          </div>
        </div>

        {/* Referral pipeline */}
        <div className="card">
          <div className="card-head"><span className="card-title">Referral Pipeline</span></div>
          <div style={{ padding:20 }}>
            {refData.length>0?(
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ink-4)' }}>Total</span>
                  <span style={{ fontFamily:'var(--f-display)',fontSize:28,color:'var(--ink)' }}>{refStats.total||0}</span>
                </div>
                {refData.map(({status,count}:any)=>{
                  const max=Math.max(...refData.map((r:any)=>r.count as number),1)
                  return (
                    <div key={status}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span className={`status-chip s-${status}`}>{status}</span>
                        <span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--ink-2)' }}>{count}</span>
                      </div>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width:`${(count/max)*100}%`, background:STATUS_COLORS[status]||'var(--ink-4)' }}/>
                      </div>
                    </div>
                  )
                })}
                {refStats.urgent_open>0&&(
                  <div style={{ marginTop:8,padding:'8px 12px',background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',
                    borderRadius:'var(--r-sm)',fontFamily:'var(--f-cond)',fontSize:12,fontWeight:700,color:'var(--red)',letterSpacing:'0.04em' }}>
                    ⚠ {refStats.urgent_open} urgent open
                  </div>
                )}
              </div>
            ):(
              <div className="empty"><div className="empty-icon"><span style={{ fontSize:22 }}>⇆</span></div><div className="empty-sub">No referrals yet</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Ministry Export */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Ministry Export</span>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>alert('Export ready — requires backend connection')}>
              <FileText size={13}/> PDF Report
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{
              const blob=new Blob([JSON.stringify({overview:ov,timeline},null,2)],{type:'application/json'})
              const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='retinagpt_analytics.json';a.click()
            }}>
              <Download size={13}/> JSON Export
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>alert('WHO format — coming in v3.1')}>
              ↗ WHO Format
            </button>
          </div>
        </div>
        <div style={{ padding:'20px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
          {[
            {label:'Screening Coverage', val:`${ov?.screening_coverage_pct||0}%`, note:'vs 60% target', color:'var(--blue)'},
            {label:'DR Prevalence', val:`${ov?.referable_rate_pct||0}%`, note:'of screened population', color:'var(--amber)'},
            {label:'Referral Rate', val:ov?`${Math.round((refStats.total||0)/(ov.total_scans||1)*100)}%`:'—', note:'of positive cases', color:'var(--amber)'},
            {label:'Completion Rate', val:refStats.by_status?`${Math.round((refStats.by_status.completed||0)/Math.max(refStats.total||1,1)*100)}%`:'—', note:'referrals closed', color:'var(--green)'},
          ].map((m,i)=>(
            <div key={i} style={{ textAlign:'center', padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--r-md)' }}>
              <div style={{ fontFamily:'var(--f-display)',fontSize:44,color:m.color,lineHeight:1 }}>{m.val}</div>
              <div style={{ fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ink-4)',marginTop:8 }}>{m.label}</div>
              <div style={{ fontSize:10,color:'var(--ink-4)',marginTop:3 }}>{m.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
