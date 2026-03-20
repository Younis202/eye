'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { RefreshCw, MapPin, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const BASE    = '/api/retina'
const PURPLE  = '#7C3AED'
const ROYAL   = '#5B21B6'

// Egypt governorates with simulated DR data
const GOVERNORATES = [
  { name:'Cairo',       code:'CAI', region:'Greater Cairo', pop:10100000, screened:14200, prevalence:12.4, change:+1.2,  cci:0.88 },
  { name:'Giza',        code:'GIZ', region:'Greater Cairo', pop:8800000,  screened:10800, prevalence:13.1, change:+0.8,  cci:0.82 },
  { name:'Qalyubia',    code:'QAL', region:'Greater Cairo', pop:5400000,  screened:6100,  prevalence:11.8, change:-0.3,  cci:0.78 },
  { name:'Alexandria',  code:'ALX', region:'North Coast',   pop:5200000,  screened:9400,  prevalence:10.2, change:-1.1,  cci:0.91 },
  { name:'Beheira',     code:'BHR', region:'North Coast',   pop:5600000,  screened:5200,  prevalence:15.6, change:+2.1,  cci:0.62 },
  { name:'Dakahlia',    code:'DAK', region:'Delta',         pop:6100000,  screened:6800,  prevalence:14.8, change:+1.4,  cci:0.71 },
  { name:'Sharqia',     code:'SHA', region:'Delta',         pop:6900000,  screened:7200,  prevalence:13.9, change:+0.5,  cci:0.73 },
  { name:'Gharbia',     code:'GHR', region:'Delta',         pop:4200000,  screened:5100,  prevalence:12.6, change:-0.2,  cci:0.79 },
  { name:'Monufia',     code:'MON', region:'Delta',         pop:3700000,  screened:3900,  prevalence:16.2, change:+2.8,  cci:0.58 },
  { name:'Kafr el-Sheikh',code:'KFS',region:'Delta',        pop:3200000,  screened:2800,  prevalence:17.4, change:+3.1,  cci:0.51 },
  { name:'Damietta',    code:'DAM', region:'Delta',         pop:1600000,  screened:2100,  prevalence:11.3, change:-0.6,  cci:0.84 },
  { name:'Port Said',   code:'POR', region:'Canal',         pop:800000,   screened:1900,  prevalence:9.8,  change:-1.4,  cci:0.93 },
  { name:'Ismailia',    code:'ISM', region:'Canal',         pop:1100000,  screened:1600,  prevalence:10.5, change:-0.8,  cci:0.87 },
  { name:'Suez',        code:'SUZ', region:'Canal',         pop:760000,   screened:1400,  prevalence:11.1, change:-0.3,  cci:0.85 },
  { name:'Fayyum',      code:'FAY', region:'Upper Egypt',   pop:3200000,  screened:2600,  prevalence:18.8, change:+3.6,  cci:0.44 },
  { name:'Beni Suef',   code:'BNS', region:'Upper Egypt',   pop:3100000,  screened:2400,  prevalence:19.2, change:+4.1,  cci:0.42 },
  { name:'Minya',       code:'MIN', region:'Upper Egypt',   pop:5400000,  screened:3800,  prevalence:21.5, change:+5.0,  cci:0.38 },
  { name:'Assiut',      code:'ASS', region:'Upper Egypt',   pop:4100000,  screened:3100,  prevalence:20.1, change:+3.8,  cci:0.41 },
  { name:'Sohag',       code:'SOH', region:'Upper Egypt',   pop:4800000,  screened:2900,  prevalence:22.3, change:+5.4,  cci:0.36 },
  { name:'Qena',        code:'QEN', region:'Upper Egypt',   pop:3200000,  screened:2200,  prevalence:23.1, change:+5.7,  cci:0.34 },
  { name:'Luxor',       code:'LUX', region:'Upper Egypt',   pop:1200000,  screened:1100,  prevalence:24.6, change:+6.2,  cci:0.30 },
  { name:'Aswan',       code:'ASW', region:'Upper Egypt',   pop:1500000,  screened:980,   prevalence:25.8, change:+6.9,  cci:0.28 },
  { name:'Red Sea',     code:'RED', region:'Eastern Desert', pop:380000,  screened:710,   prevalence:8.2,  change:-2.1,  cci:0.95 },
  { name:'Matruh',      code:'MAT', region:'Western Desert', pop:470000,  screened:420,   prevalence:9.1,  change:-1.8,  cci:0.88 },
  { name:'New Valley',  code:'NVL', region:'Western Desert', pop:240000,  screened:280,   prevalence:10.8, change:-0.5,  cci:0.81 },
  { name:'North Sinai', code:'NSN', region:'Sinai',          pop:490000,  screened:560,   prevalence:9.6,  change:-1.2,  cci:0.86 },
  { name:'South Sinai', code:'SSN', region:'Sinai',          pop:170000,  screened:310,   prevalence:7.8,  change:-2.4,  cci:0.96 },
]

function prevColor(p: number) {
  if (p >= 22) return '#9F1239'
  if (p >= 18) return '#DC2626'
  if (p >= 15) return '#F97316'
  if (p >= 12) return '#D97706'
  if (p >= 10) return '#059669'
  return '#047857'
}

function prevLabel(p: number) {
  if (p >= 22) return 'Critical'
  if (p >= 18) return 'Very High'
  if (p >= 15) return 'High'
  if (p >= 12) return 'Moderate'
  if (p >= 10) return 'Low'
  return 'Very Low'
}

export default function PrevalencePage() {
  const [sort,     setSort]     = useState<'prevalence'|'name'|'screened'|'cci'>('prevalence')
  const [region,   setRegion]   = useState<string>('All')
  const [selected, setSelected] = useState<typeof GOVERNORATES[0]|null>(null)
  const [loading,  setLoading]  = useState(false)

  const regions = ['All', ...Array.from(new Set(GOVERNORATES.map(g=>g.region)))]
  const filtered = (region==='All'?GOVERNORATES:GOVERNORATES.filter(g=>g.region===region)).sort((a,b)=>{
    if (sort==='prevalence') return b.prevalence - a.prevalence
    if (sort==='screened')   return b.screened   - a.screened
    if (sort==='cci')        return b.cci         - a.cci
    return a.name.localeCompare(b.name)
  })

  const national = {
    avgPrevalence: (GOVERNORATES.reduce((s,g)=>s+g.prevalence,0)/GOVERNORATES.length).toFixed(1),
    totalScreened: GOVERNORATES.reduce((s,g)=>s+g.screened,0).toLocaleString(),
    highRisk: GOVERNORATES.filter(g=>g.prevalence>=18).length,
    target: GOVERNORATES.filter(g=>g.cci>=0.8).length,
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }} className="anim-up">
        <div>
          <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:PURPLE, marginBottom:6 }}>Ministry of Health · Epidemiology</div>
          <div className="page-title">National DR<br/><span style={{ color:PURPLE }}>Prevalence Map</span></div>
          <div className="page-subtitle" style={{ marginTop:6 }}>Diabetic Retinopathy burden across 27 Egyptian governorates</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>{ setLoading(true); setTimeout(()=>setLoading(false),800) }}>
          <RefreshCw size={13} style={{ animation:loading?'spin 0.9s linear infinite':undefined }}/> Refresh
        </button>
      </div>

      {/* National KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, background:'var(--border)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:24, boxShadow:'var(--shadow-sm)' }} className="anim-up-1">
        {[
          { label:'Avg. DR Prevalence',    val:`${national.avgPrevalence}%`,               color:PURPLE },
          { label:'Total Screened (YTD)',  val: national.totalScreened,                     color:'#2563EB' },
          { label:'High-Risk Governorates',val: national.highRisk,                           color:'#DC2626' },
          { label:'At WHO Coverage Target',val: national.target,                             color:'#059669' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--surface)', padding:'22px 24px', borderRight:i<3?'1px solid var(--border)':'none', position:'relative', textAlign:'center' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:0.7 }}/>
            <div style={{ fontFamily:'var(--f-display)', fontSize:40, letterSpacing:'0.02em', color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-4)', marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        {/* Main table */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Filters */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }} className="anim-up-2">
            <div style={{ display:'flex', gap:6 }}>
              {regions.map(r => (
                <button key={r} onClick={()=>setRegion(r)}
                  style={{ padding:'6px 14px', borderRadius:'var(--r-pill)', border:`1px solid ${region===r?PURPLE:'var(--border)'}`, background:region===r?`${PURPLE}12`:'var(--surface)', fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, letterSpacing:'0.04em', color:region===r?PURPLE:'var(--ink-3)', cursor:'pointer', transition:'all 0.12s' }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:'var(--f-cond)', fontSize:10, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Sort:</span>
              {(['prevalence','screened','cci','name'] as const).map(s=>(
                <button key={s} onClick={()=>setSort(s)}
                  style={{ padding:'5px 12px', borderRadius:'var(--r-pill)', border:`1px solid ${sort===s?PURPLE:'var(--border)'}`, background:sort===s?`${PURPLE}12`:'var(--surface)', fontFamily:'var(--f-mono)', fontSize:10, color:sort===s?PURPLE:'var(--ink-4)', cursor:'pointer', transition:'all 0.12s' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Heat table */}
          <div className="card anim-up-3" style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Governorate</th>
                    <th>Region</th>
                    <th>Population</th>
                    <th>Screened</th>
                    <th>DR Prevalence</th>
                    <th>YoY Change</th>
                    <th>Coverage Index</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g, i) => {
                    const color = prevColor(g.prevalence)
                    const label = prevLabel(g.prevalence)
                    return (
                      <tr key={g.code} style={{ cursor:'pointer', background:selected?.code===g.code?`${PURPLE}06`:undefined }}
                        onClick={()=>setSelected(selected?.code===g.code?null:g)}>
                        <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-4)' }}>{i+1}</span></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <MapPin size={12} color={color}/>
                            <span style={{ fontWeight:600, color:'var(--ink)' }}>{g.name}</span>
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>{g.code}</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily:'var(--f-cond)', fontSize:10, color:'var(--ink-4)' }}>{g.region}</span></td>
                        <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11 }}>{(g.pop/1000000).toFixed(1)}M</span></td>
                        <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11 }}>{g.screened.toLocaleString()}</span></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'var(--surface-2)', borderRadius:3, minWidth:60 }}>
                              <div style={{ height:'100%', background:color, borderRadius:3, width:`${Math.min((g.prevalence/30)*100,100)}%`, transition:'width 0.4s' }}/>
                            </div>
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:12, fontWeight:700, color }}>{g.prevalence}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            {g.change > 0 ? <TrendingUp size={12} color="#DC2626"/> : g.change < 0 ? <TrendingDown size={12} color="#059669"/> : <Minus size={12} color="var(--ink-4)"/>}
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:g.change>0?'#DC2626':g.change<0?'#059669':'var(--ink-4)' }}>{g.change>0?'+':''}{g.change.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:32, height:6, background:'var(--surface-2)', borderRadius:3 }}>
                              <div style={{ height:'100%', background:g.cci>=0.8?'#059669':'#D97706', borderRadius:3, width:`${g.cci*100}%` }}/>
                            </div>
                            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-3)' }}>{(g.cci*100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:'var(--r-pill)', background:`${color}12`, color, letterSpacing:'0.06em' }}>{label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Selected detail */}
          {selected ? (
            <div className="card anim-up" style={{ border:`1px solid ${prevColor(selected.prevalence)}30` }}>
              <div style={{ padding:'20px', background:`linear-gradient(135deg, ${prevColor(selected.prevalence)}10 0%, transparent 100%)`, borderRadius:'var(--r-xl) var(--r-xl) 0 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:'var(--ink)', letterSpacing:'0.03em' }}>{selected.name}</div>
                    <div style={{ fontFamily:'var(--f-cond)', fontSize:10, color:'var(--ink-4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{selected.region} · {selected.code}</div>
                  </div>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:28, fontWeight:700, color:prevColor(selected.prevalence) }}>{selected.prevalence}%</span>
                </div>
                <span style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:'var(--r-pill)', background:`${prevColor(selected.prevalence)}18`, color:prevColor(selected.prevalence), letterSpacing:'0.08em', border:`1px solid ${prevColor(selected.prevalence)}30` }}>{prevLabel(selected.prevalence)} Risk</span>
              </div>
              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Population',       val:(selected.pop/1000000).toFixed(2)+'M' },
                  { label:'Screened (YTD)',    val:selected.screened.toLocaleString() },
                  { label:'Coverage Index',   val:`${(selected.cci*100).toFixed(0)}%` },
                  { label:'YoY Change',       val:`${selected.change>0?'+':''}${selected.change.toFixed(1)}%`, color:selected.change>0?'#DC2626':'#059669' },
                ].map((m,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<3?'1px solid var(--border)':'none' }}>
                    <span style={{ fontFamily:'var(--f-cond)', fontSize:11, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</span>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:12, fontWeight:700, color:m.color||'var(--ink)' }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty" style={{ padding:'32px 20px' }}>
                <MapPin size={28} color="var(--ink-4)" style={{ marginBottom:8 }}/>
                <div className="empty-title">Select a Governorate</div>
                <div className="empty-sub">Click any row to see detailed statistics</div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="card">
            <div className="card-head"><span className="card-title">Prevalence Legend</span></div>
            <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { range:'≥ 22%', label:'Critical',  color:'#9F1239' },
                { range:'18–22%',label:'Very High',  color:'#DC2626' },
                { range:'15–18%',label:'High',       color:'#F97316' },
                { range:'12–15%',label:'Moderate',   color:'#D97706' },
                { range:'10–12%',label:'Low',        color:'#059669' },
                { range:'< 10%', label:'Very Low',   color:'#047857' },
              ].map((l,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:11, color:'var(--ink-3)', flex:1 }}>{l.label}</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>{l.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional summary */}
          <div className="card">
            <div className="card-head"><span className="card-title">Regional Summary</span></div>
            <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {Array.from(new Set(GOVERNORATES.map(g=>g.region))).map(r=>{
                const govs = GOVERNORATES.filter(g=>g.region===r)
                const avg  = govs.reduce((s,g)=>s+g.prevalence,0)/govs.length
                return (
                  <div key={r} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{r}</div>
                      <div style={{ height:5, background:'var(--surface-2)', borderRadius:3 }}>
                        <div style={{ height:'100%', background:prevColor(avg), borderRadius:3, width:`${(avg/30)*100}%` }}/>
                      </div>
                    </div>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:11, fontWeight:700, color:prevColor(avg), minWidth:42, textAlign:'right' }}>{avg.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
