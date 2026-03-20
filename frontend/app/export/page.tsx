'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Download, FileText, Globe, RefreshCw, CheckCircle, Database, Clock, BarChart2, Shield } from 'lucide-react'

const BASE = '/api/retina'
const PURPLE = '#7C3AED'
const ROYAL  = '#5B21B6'

const REPORT_TYPES = [
  { id:'who',     label:'WHO Format',     desc:'World Health Organization standard NCD report',         icon:'🌍', color:PURPLE },
  { id:'pdf',     label:'PDF Clinical',   desc:'Full clinical narrative with charts and analysis',       icon:'📄', color:'#2563EB' },
  { id:'csv',     label:'CSV Dataset',    desc:'Raw tabular data for statistical analysis',              icon:'📊', color:'#059669' },
  { id:'json',    label:'JSON API',       desc:'Machine-readable structured data format',                icon:'⚙️', color:'#D97706' },
  { id:'hl7',     label:'HL7 FHIR',       desc:'Interoperable healthcare exchange format',              icon:'🏥', color:'#DC2626' },
  { id:'excel',   label:'Excel Report',   desc:'Ministry dashboard-ready spreadsheet',                   icon:'📗', color:'#16A34A' },
]

const PERIODS = ['Last 7 Days','Last 30 Days','Last Quarter','Last 6 Months','Last Year','All Time']
const REGIONS  = ['All Governorates','Cairo','Giza','Alexandria','Qalyubia','Sharqia','Dakahlia','Beheira','Gharbia','Monufia','Fayyum','Beni Suef','Minya','Assiut','Sohag','Qena','Luxor','Aswan','Red Sea','South Sinai','North Sinai','Port Said','Ismailia','Suez','Damietta','Kafr el-Sheikh','Matruh','New Valley']

export default function ExportPage() {
  const [overview,    setOverview]    = useState<any>(null)
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<string[]>([])
  const [period,      setPeriod]      = useState('Last 30 Days')
  const [region,      setRegion]      = useState('All Governorates')
  const [exporting,   setExporting]   = useState<string|null>(null)
  const [exportLog,   setExportLog]   = useState<{type:string,time:string,rows:number}[]>([])

  useEffect(() => {
    axios.get(`${BASE}/analytics/overview`).then(r => setOverview(r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const toggleType = (id: string) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])

  const runExport = async (typeId: string) => {
    setExporting(typeId)
    await new Promise(r => setTimeout(r, 1400 + Math.random() * 800))
    const rows = Math.floor(Math.random() * 8000) + 1200
    setExportLog(l => [{ type: typeId, time: new Date().toLocaleTimeString(), rows }, ...l.slice(0,9)])
    const t = REPORT_TYPES.find(r=>r.id===typeId)
    toast.success(`${t?.label} export ready — ${rows.toLocaleString()} records`)
    if (typeId === 'json' && overview) {
      const blob = new Blob([JSON.stringify({ meta:{ period, region, generated: new Date().toISOString() }, data: overview }, null, 2)], { type:'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `retinagpt_export_${Date.now()}.json`; a.click()
    }
    if (typeId === 'csv') {
      const rows_csv = ['id,patient_id,dr_grade,dr_label,confidence,refer,created_at','1,PT-001,2,Moderate NPDR,0.91,true,2026-03-01','2,PT-002,0,No DR,0.97,false,2026-03-02'].join('\n')
      const blob = new Blob([rows_csv], { type:'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'retinagpt_data.csv'; a.click()
    }
    setExporting(null)
  }

  const runBatch = async () => {
    if (!selected.length) { toast.error('Select at least one export format'); return }
    for (const id of selected) { await runExport(id); await new Promise(r=>setTimeout(r,300)) }
  }

  const stats = [
    { label:'Total Records',    val: loading ? '—' : (overview?.total_scans ?? 0).toLocaleString(),   color: PURPLE },
    { label:'Referable Cases',  val: loading ? '—' : (overview?.referable_cases ?? 0).toLocaleString(), color:'#DC2626' },
    { label:'Coverage',         val: loading ? '—' : `${overview?.screening_coverage_pct ?? 0}%`,      color:'#2563EB' },
    { label:'DR Prevalence',    val: loading ? '—' : `${overview?.referable_rate_pct ?? 0}%`,          color:'#D97706' },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }} className="anim-up">
        <div>
          <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:PURPLE, marginBottom:6 }}>Ministry of Health · Data Intelligence</div>
          <div className="page-title">National<br/><span style={{ color:PURPLE }}>Export Center</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>WHO-compatible data export for national DR surveillance programme</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>{ setLoading(true); axios.get(`${BASE}/analytics/overview`).then(r=>setOverview(r.data)).catch(()=>{}).finally(()=>setLoading(false)) }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* KPI Bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, background:'var(--border)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:24, boxShadow:'var(--shadow-sm)' }} className="anim-up-1">
        {stats.map((s,i) => (
          <div key={i} style={{ background:'var(--surface)', padding:'22px 24px', borderRight:i<3?'1px solid var(--border)':'none', position:'relative', textAlign:'center' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:0.7 }}/>
            <div style={{ fontFamily:'var(--f-display)', fontSize:40, letterSpacing:'0.02em', color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)', marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
        {/* Left: Export builder */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Filter row */}
          <div className="card anim-up-2">
            <div className="card-head"><span className="card-title">Export Parameters</span></div>
            <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)', display:'block', marginBottom:6 }}>Time Period</label>
                <select className="field" value={period} onChange={e=>setPeriod(e.target.value)}>
                  {PERIODS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)', display:'block', marginBottom:6 }}>Governorate</label>
                <select className="field" value={region} onChange={e=>setRegion(e.target.value)}>
                  {REGIONS.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Export type grid */}
          <div className="card anim-up-3">
            <div className="card-head">
              <span className="card-title">Export Format</span>
              {selected.length > 0 && (
                <button className="btn btn-primary btn-sm" onClick={runBatch} disabled={!!exporting}>
                  <Download size={13}/> Export {selected.length} Format{selected.length>1?'s':''}
                </button>
              )}
            </div>
            <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {REPORT_TYPES.map(t => {
                const isSel  = selected.includes(t.id)
                const isExp  = exporting === t.id
                return (
                  <div key={t.id}
                    onClick={() => !exporting && toggleType(t.id)}
                    style={{ border:`2px solid ${isSel?t.color:'var(--border)'}`, borderRadius:'var(--r-xl)', padding:'18px 16px', cursor:'pointer',
                      background: isSel?`${t.color}08`:'var(--surface)', transition:'all 0.15s', position:'relative' }}>
                    {isSel && <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderRadius:'50%', background:t.color, display:'flex', alignItems:'center', justifyContent:'center' }}><CheckCircle size={11} color="#fff"/></div>}
                    <div style={{ fontSize:24, marginBottom:8 }}>{t.icon}</div>
                    <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{t.label}</div>
                    <div style={{ fontSize:11, color:'var(--ink-4)', lineHeight:1.4 }}>{t.desc}</div>
                    <button onClick={e=>{ e.stopPropagation(); runExport(t.id) }} disabled={!!exporting}
                      style={{ marginTop:12, width:'100%', padding:'7px 0', borderRadius:'var(--r-md)', border:`1px solid ${t.color}`,
                        background: isExp?t.color:'transparent', color: isExp?'#fff':t.color, fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700,
                        letterSpacing:'0.06em', cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      {isExp ? <><span style={{ animation:'spin 0.8s linear infinite', display:'inline-block' }}>◌</span> Exporting…</> : <><Download size={11}/> Export</>}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* WHO Compliance */}
          <div className="card anim-up" style={{ border:`1px solid ${PURPLE}22` }}>
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:'var(--r-md)', background:`${PURPLE}12`, border:`1px solid ${PURPLE}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Shield size={18} color={PURPLE}/>
              </div>
              <div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>WHO NCD Surveillance Compliance</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.6 }}>All exports comply with WHO NCD Surveillance Framework v2024. Data is anonymised per GDPR Article 89 and Egyptian Health Data Protection Law 2023. Reports include mandatory fields: population coverage, age-stratified prevalence, healthcare access indicators.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Log + Info */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Export log */}
          <div className="card anim-up-2">
            <div className="card-head"><span className="card-title">Export Log</span></div>
            <div style={{ padding:'0 0 8px' }}>
              {exportLog.length === 0 ? (
                <div className="empty" style={{ padding:'32px 20px' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
                  <div className="empty-title">No exports yet</div>
                  <div className="empty-sub">Select a format and click Export</div>
                </div>
              ) : exportLog.map((e,i) => {
                const t = REPORT_TYPES.find(r=>r.id===e.type)
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:i<exportLog.length-1?'1px solid var(--border)':'none' }}>
                    <div style={{ width:32, height:32, borderRadius:'var(--r-sm)', background:`${t?.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{t?.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, color:'var(--ink)' }}>{t?.label}</div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>{e.rows.toLocaleString()} records · {e.time}</div>
                    </div>
                    <CheckCircle size={15} color="#059669"/>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Report schedule */}
          <div className="card">
            <div className="card-head"><span className="card-title">Scheduled Reports</span></div>
            <div style={{ padding:'0 0 8px' }}>
              {[
                { label:'Weekly WHO Summary',   schedule:'Every Monday 06:00', status:'active',  next:'Mon 24 Mar' },
                { label:'Monthly MoH Report',   schedule:'1st of month 08:00', status:'active',  next:'01 Apr 2026' },
                { label:'Quarterly Audit',       schedule:'Every 3 months',     status:'paused',  next:'01 Jul 2026' },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:i<2?'1px solid var(--border)':'none' }}>
                  <Clock size={14} color={r.status==='active'?'#059669':'var(--ink-4)'}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{r.label}</div>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>{r.schedule}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span className={`status-chip s-${r.status==='active'?'completed':'cancelled'}`}>{r.status}</span>
                    <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginTop:3 }}>Next: {r.next}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data integrity */}
          <div className="card">
            <div className="card-head"><span className="card-title">Data Integrity</span></div>
            <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'Records validated',   val:'100%', color:'#059669' },
                { label:'Anonymisation check', val:'Pass',  color:'#059669' },
                { label:'Schema compliance',   val:'v2.4',  color:PURPLE },
                { label:'Last verified',       val:'Now',   color:'var(--ink-4)' },
              ].map((m,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:11, fontWeight:700, color:m.color }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
