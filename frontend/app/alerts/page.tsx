'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, Bell, CheckCheck, X, TrendingUp, Shield, Clock, Zap, RefreshCw, ChevronRight } from 'lucide-react'

const PURPLE = '#7C3AED'
const ROYAL  = '#5B21B6'

type AlertSeverity = 'critical'|'high'|'medium'|'info'
type AlertStatus   = 'active'|'acknowledged'|'resolved'

interface PolicyAlert {
  id:       string
  severity: AlertSeverity
  status:   AlertStatus
  category: string
  title:    string
  body:     string
  gov?:     string
  metric?:  string
  value?:   string
  threshold?:string
  time:     string
  action?:  string
}

const INITIAL_ALERTS: PolicyAlert[] = [
  { id:'A001', severity:'critical', status:'active',       category:'Prevalence Spike',   title:'Critical DR prevalence spike — Aswan Governorate',          body:'DR prevalence has risen to 25.8% in Aswan, exceeding the national critical threshold of 22%. Immediate mobile screening deployment recommended.',                                       gov:'Aswan',       metric:'DR Prevalence', value:'25.8%',  threshold:'22.0%', time:'2 hours ago',   action:'Deploy mobile unit' },
  { id:'A002', severity:'critical', status:'active',       category:'Capacity Alert',     title:'Screening capacity below emergency threshold — Upper Egypt', body:'5 Upper Egypt governorates are at <40% WHO-recommended screening coverage. At current rate, 2026 national target will be missed by 34%.',                                                   gov:'Upper Egypt', metric:'Coverage',      value:'38%',    threshold:'60%',   time:'5 hours ago',   action:'Request emergency funding' },
  { id:'A003', severity:'high',     status:'active',       category:'Referral Backlog',   title:'Surgical referral queue exceeding 90-day wait time',         body:'National average wait time for vitreoretinal surgery referrals has reached 94 days, up from 61 days in Q3 2025. 847 patients affected.',                                                 gov:'National',    metric:'Wait Time',     value:'94 days', threshold:'60 days', time:'1 day ago',     action:'Activate private sector' },
  { id:'A004', severity:'high',     status:'acknowledged', category:'Data Quality',       title:'Missing screening data — 3 governorates — February 2026',  body:'Kafr el-Sheikh, North Sinai, and Matruh have not submitted monthly screening reports for February 2026. WHO reporting deadline in 6 days.',                                            gov:'Multiple',    metric:'Reports',       value:'0/3',    threshold:'3/3',   time:'2 days ago',    action:'Contact health directors' },
  { id:'A005', severity:'high',     status:'active',       category:'Prevalence Spike',   title:'Monufia DR prevalence 3-month rise: +2.8%',                 body:'Sustained upward trend detected in Monufia (16.2%). Statistical analysis confirms non-random trend (p<0.01). Risk factors: increased diabetes registrations in Delta region.',          gov:'Monufia',     metric:'Trend',         value:'+2.8%',  threshold:'+1.5%', time:'3 days ago',    action:'Targeted campaign' },
  { id:'A006', severity:'medium',   status:'active',       category:'Model Drift',        title:'AI model confidence drop detected — batch screening',       body:'Mean confidence score for grade 2+ predictions has dropped from 0.91 to 0.84 over 30 days. Model recalibration with new APTOS data recommended.',                                          metric:'AI Conf.',  value:'0.84',           threshold:'0.88', time:'4 days ago', action:'Schedule retraining' },
  { id:'A007', severity:'medium',   status:'acknowledged', category:'Coverage Gap',       title:'Rural female screening coverage: 28% below national average',body:'Gender disparity analysis shows rural female patients are 28% less likely to be screened. Community health worker programme coverage gap identified in 8 governorates.',                        metric:'Gender Gap',value:'-28%',           threshold:'±5%', time:'5 days ago',  action:'Review outreach protocol' },
  { id:'A008', severity:'medium',   status:'resolved',     category:'System',             title:'API latency spike resolved — Cairo Hub',                    body:'Network infrastructure issue at Cairo data hub caused 340ms average API latency increase on 18 Mar 2026 between 14:00–16:30. All systems nominal.',                                             gov:'Cairo',       metric:'Latency',       value:'Resolved',threshold:'<100ms', time:'2 days ago' },
  { id:'A009', severity:'info',     status:'active',       category:'Policy',             title:'WHO NCD Framework 2026 update requires new data fields',   body:'WHO has released updated NCD Surveillance Framework (March 2026). 3 new mandatory fields required from Q2 2026: socioeconomic stratum, diabetes duration, and HbA1c category.',          metric:'Compliance',value:'Pending', threshold:'Required', time:'1 week ago',  action:'Update data schema' },
  { id:'A010', severity:'info',     status:'resolved',     category:'Achievement',        title:'Alexandria reaches 91% WHO screening coverage target',      body:'Alexandria Governorate has achieved 91% screening coverage, exceeding the WHO 80% target. Best-practice implementation to be shared as national model.',                                      gov:'Alexandria',  metric:'Coverage',      value:'91%', threshold:'80%', time:'1 week ago' },
]

const SEV_META: Record<AlertSeverity, { color:string; bg:string; border:string; label:string }> = {
  critical: { color:'#9F1239', bg:'rgba(159,18,57,0.08)',  border:'rgba(159,18,57,0.25)',  label:'Critical' },
  high:     { color:'#DC2626', bg:'rgba(220,38,38,0.06)',  border:'rgba(220,38,38,0.2)',   label:'High' },
  medium:   { color:'#D97706', bg:'rgba(217,119,6,0.06)',  border:'rgba(217,119,6,0.2)',   label:'Medium' },
  info:     { color:PURPLE,    bg:`rgba(124,58,237,0.06)`, border:`rgba(124,58,237,0.2)`,  label:'Info' },
}

const STATUS_META: Record<AlertStatus, { color:string; label:string }> = {
  active:       { color:'#DC2626', label:'Active' },
  acknowledged: { color:'#D97706', label:'Acknowledged' },
  resolved:     { color:'#059669', label:'Resolved' },
}

export default function AlertsPage() {
  const [alerts,   setAlerts]   = useState<PolicyAlert[]>(INITIAL_ALERTS)
  const [sevFilter,setSevFilter]= useState<AlertSeverity|'all'>('all')
  const [statFilter,setStatFilter]=useState<AlertStatus|'all'>('all')
  const [selected, setSelected] = useState<PolicyAlert|null>(null)
  const [refreshing,setRefreshing]=useState(false)

  const acknowledge = (id: string) => {
    setAlerts(a => a.map(x => x.id===id && x.status==='active' ? {...x,status:'acknowledged'} : x))
    if (selected?.id===id) setSelected(s => s ? {...s,status:'acknowledged'} : null)
  }
  const resolve = (id: string) => {
    setAlerts(a => a.map(x => x.id===id ? {...x,status:'resolved'} : x))
    if (selected?.id===id) setSelected(s => s ? {...s,status:'resolved'} : null)
  }
  const refresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 900)
  }

  const filtered = alerts.filter(a =>
    (sevFilter ==='all' || a.severity ===sevFilter) &&
    (statFilter==='all' || a.status   ===statFilter)
  )

  const counts = {
    critical: alerts.filter(a=>a.severity==='critical'&&a.status!=='resolved').length,
    high:     alerts.filter(a=>a.severity==='high'    &&a.status!=='resolved').length,
    active:   alerts.filter(a=>a.status==='active').length,
    resolved: alerts.filter(a=>a.status==='resolved').length,
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }} className="anim-up">
        <div>
          <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:PURPLE, marginBottom:6 }}>Ministry of Health · Policy Intelligence</div>
          <div className="page-title">Policy<br/><span style={{ color:PURPLE }}>Alerts</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>National DR surveillance thresholds and automated policy triggers</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {counts.active > 0 && (
            <button className="btn btn-outline btn-sm" style={{ borderColor:'#DC2626', color:'#DC2626' }} onClick={()=>{ alerts.filter(a=>a.status==='active').forEach(a=>acknowledge(a.id)) }}>
              <CheckCheck size={13}/> Ack. All Active
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={refresh}>
            <RefreshCw size={13} style={{ animation:refreshing?'spin 0.9s linear infinite':undefined }}/> Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, background:'var(--border)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:24, boxShadow:'var(--shadow-sm)' }} className="anim-up-1">
        {[
          { label:'Critical Active',  val:counts.critical, color:'#9F1239' },
          { label:'High Priority',    val:counts.high,     color:'#DC2626' },
          { label:'Needs Action',     val:counts.active,   color:'#D97706' },
          { label:'Resolved (30d)',   val:counts.resolved, color:'#059669' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--surface)', padding:'22px 24px', borderRight:i<3?'1px solid var(--border)':'none', position:'relative', textAlign:'center' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:0.7 }}/>
            <div style={{ fontFamily:'var(--f-display)', fontSize:40, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)', marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
        {/* Alert list */}
        <div>
          {/* Filter bar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }} className="anim-up-2">
            <div style={{ display:'flex', gap:6 }}>
              {(['all','critical','high','medium','info'] as const).map(s=>{
                const meta = s==='all' ? null : SEV_META[s]
                return (
                  <button key={s} onClick={()=>setSevFilter(s)}
                    style={{ padding:'5px 13px', borderRadius:'var(--r-pill)', border:`1px solid ${sevFilter===s?meta?.color||PURPLE:'var(--border)'}`, background:sevFilter===s?meta?`${meta.color}12`:`${PURPLE}12`:'var(--surface)', fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:sevFilter===s?meta?.color||PURPLE:'var(--ink-4)', cursor:'pointer', transition:'all 0.12s', textTransform:'capitalize' }}>
                    {s}
                  </button>
                )
              })}
            </div>
            <div style={{ width:1, height:20, background:'var(--border)', margin:'0 4px' }}/>
            <div style={{ display:'flex', gap:6 }}>
              {(['all','active','acknowledged','resolved'] as const).map(s=>(
                <button key={s} onClick={()=>setStatFilter(s)}
                  style={{ padding:'5px 13px', borderRadius:'var(--r-pill)', border:`1px solid ${statFilter===s?STATUS_META[s as AlertStatus]?.color||PURPLE:'var(--border)'}`, background:statFilter===s?`${STATUS_META[s as AlertStatus]?.color||PURPLE}12`:'var(--surface)', fontFamily:'var(--f-mono)', fontSize:10, color:statFilter===s?STATUS_META[s as AlertStatus]?.color||PURPLE:'var(--ink-4)', cursor:'pointer', transition:'all 0.12s', textTransform:'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Alert cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }} className="anim-up-3">
            {filtered.length === 0 && (
              <div className="card"><div className="empty" style={{ padding:'40px 20px' }}>
                <Bell size={28} color="var(--ink-4)" style={{ marginBottom:8 }}/>
                <div className="empty-title">No alerts match filters</div>
                <div className="empty-sub">Try changing severity or status filter</div>
              </div></div>
            )}
            {filtered.map(a => {
              const sev = SEV_META[a.severity]
              const sta = STATUS_META[a.status]
              const isSelected = selected?.id === a.id
              return (
                <div key={a.id} onClick={()=>setSelected(isSelected?null:a)}
                  style={{ background:isSelected?sev.bg:'var(--surface)', border:`1px solid ${isSelected?sev.border:'var(--border)'}`, borderLeft:`4px solid ${sev.color}`, borderRadius:'var(--r-xl)', padding:'16px 20px', cursor:'pointer', transition:'all 0.15s', boxShadow:isSelected?`0 0 0 1px ${sev.border}`:'var(--shadow-xs)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:sev.bg, border:`1px solid ${sev.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <AlertTriangle size={16} color={sev.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'2px 8px', borderRadius:'var(--r-pill)', background:sev.bg, color:sev.color, border:`1px solid ${sev.border}` }}>{sev.label}</span>
                        <span style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-4)' }}>{a.category}</span>
                        {a.gov && <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>· {a.gov}</span>}
                      </div>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--ink)', marginBottom:4, lineHeight:1.4 }}>{a.title}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5, display:isSelected?'block':'-webkit-box', WebkitLineClamp:isSelected?undefined:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.body}</div>
                      {a.metric && (
                        <div style={{ display:'flex', gap:16, marginTop:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ fontFamily:'var(--f-cond)', fontSize:9, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{a.metric}:</span>
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, fontWeight:700, color:sev.color }}>{a.value}</span>
                          </div>
                          {a.threshold && <>
                            <span style={{ fontFamily:'var(--f-cond)', fontSize:9, color:'var(--ink-4)' }}>threshold:</span>
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-3)' }}>{a.threshold}</span>
                          </>}
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <Clock size={10} color="var(--ink-4)"/>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>{a.time}</span>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <span style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 8px', borderRadius:'var(--r-pill)', background:`${sta.color}12`, color:sta.color, border:`1px solid ${sta.color}30` }}>{sta.label}</span>
                          {a.status === 'active' && (
                            <button onClick={e=>{ e.stopPropagation(); acknowledge(a.id) }}
                              style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 10px', borderRadius:'var(--r-pill)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink-3)', cursor:'pointer' }}>
                              Acknowledge
                            </button>
                          )}
                          {a.status === 'acknowledged' && (
                            <button onClick={e=>{ e.stopPropagation(); resolve(a.id) }}
                              style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 10px', borderRadius:'var(--r-pill)', border:'1px solid #05966930', background:'#05966910', color:'#059669', cursor:'pointer' }}>
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: detail + thresholds */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Selected detail */}
          {selected ? (
            <div className="card anim-up" style={{ border:`1px solid ${SEV_META[selected.severity].border}` }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span className="card-title">{selected.id} — {SEV_META[selected.severity].label}</span>
                <button onClick={()=>setSelected(null)} style={{ width:24, height:24, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><X size={12}/></button>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:8, lineHeight:1.4 }}>{selected.title}</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.6, marginBottom:14 }}>{selected.body}</div>
                {selected.action && (
                  <div style={{ padding:'10px 14px', background:`${SEV_META[selected.severity].color}08`, border:`1px solid ${SEV_META[selected.severity].border}`, borderRadius:'var(--r-md)', marginBottom:14 }}>
                    <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)', marginBottom:3 }}>Recommended Action</div>
                    <div style={{ fontSize:12, fontWeight:600, color:SEV_META[selected.severity].color }}>{selected.action}</div>
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  {selected.status === 'active' && <button className="btn btn-outline btn-sm" style={{ flex:1, justifyContent:'center', borderColor:SEV_META[selected.severity].color, color:SEV_META[selected.severity].color }} onClick={()=>acknowledge(selected.id)}><CheckCheck size={12}/> Acknowledge</button>}
                  {selected.status === 'acknowledged' && <button className="btn btn-sm" style={{ flex:1, justifyContent:'center', background:'#059669', color:'#fff', border:'none' }} onClick={()=>resolve(selected.id)}><CheckCheck size={12}/> Mark Resolved</button>}
                  {selected.status === 'resolved' && <div style={{ fontFamily:'var(--f-cond)', fontSize:11, color:'#059669', padding:'8px 0', display:'flex', alignItems:'center', gap:6 }}><CheckCheck size={13}/> Resolved</div>}
                </div>
              </div>
            </div>
          ) : null}

          {/* Policy thresholds */}
          <div className="card anim-up-2">
            <div className="card-head"><span className="card-title">Policy Thresholds</span><Shield size={14} color={PURPLE}/></div>
            <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { param:'DR Prevalence — Critical',   threshold:'≥ 22%',    action:'Emergency response',     color:'#9F1239' },
                { param:'DR Prevalence — High',       threshold:'≥ 18%',    action:'Targeted campaign',       color:'#DC2626' },
                { param:'Screening Coverage — Min',   threshold:'< 60%',    action:'Resource reallocation',   color:'#D97706' },
                { param:'Referral Wait — Max',        threshold:'> 60 days', action:'Private sector activation',color:'#F97316'},
                { param:'AI Confidence — Min',        threshold:'< 0.88',   action:'Model recalibration',     color:PURPLE },
                { param:'YoY Prevalence Change',      threshold:'> +1.5%',  action:'Epidemiological review',  color:'#DC2626' },
              ].map((t,i) => (
                <div key={i} style={{ padding:'10px 12px', borderRadius:'var(--r-md)', background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, color:'var(--ink)' }}>{t.param}</span>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:10, fontWeight:700, color:t.color, background:`${t.color}10`, padding:'2px 8px', borderRadius:'var(--r-pill)' }}>{t.threshold}</span>
                  </div>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:10, color:'var(--ink-4)', display:'flex', alignItems:'center', gap:4 }}>
                    <Zap size={9} color={t.color}/> {t.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
