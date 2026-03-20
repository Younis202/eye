'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCaseStats, getCases, getReferralStats } from '@/lib/api'
import { getProfile, ROLE_META, type UserRole } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
import { ScanLine, Users, ArrowLeftRight, AlertTriangle, ChevronRight, Activity, TrendingUp, Eye, Layers, Globe, BarChart3 } from 'lucide-react'

const DR_COLORS  = ['#10B981','#F59E0B','#F97316','#EF4444','#9F1239']
const DR_LABELS  = ['No DR','Mild','Moderate','Severe','PDR']
const DR_CLASSES = ['g0','g1','g2','g3','g4']
const DR_FULL    = ['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','PDR']

function GradeBadge({ grade }: { grade: number }) {
  return <span className={`grade-badge ${DR_CLASSES[grade]||'g0'}`}><span className="gn">{grade}</span>{DR_FULL[grade]||'Unknown'}</span>
}

function StatTile({ val, label, color, delta, deltaUp, icon: Icon, sub }: any) {
  return (
    <div className={`stat-tile ${color}`}>
      <div className="stat-tile-accent"/>
      {Icon&&<div className="stat-tile-icon"><Icon size={16} strokeWidth={2}/></div>}
      <div className="stat-val">{val??'—'}</div>
      <div className="stat-label">{label}</div>
      {sub&&<div className="stat-sub">{sub}</div>}
      {delta!==undefined&&<div className={`stat-delta ${deltaUp?'delta-up':'delta-dn'}`}>{deltaUp?'↑':'↓'} {delta}</div>}
    </div>
  )
}

// ── CLINIC DASHBOARD ────────────────────────────────────────────────────
function ClinicDashboard({ stats, refStats, cases, profile }: any) {
  const chart = Object.entries(stats?.dr_grade_distribution||{}).map(([g,c])=>({grade:DR_LABELS[+g]||`G${g}`,count:c as number,color:DR_COLORS[+g]||'#888'}))
  const firstName = profile?.doctorName?.split(' ')[0] || 'Doctor'

  return (
    <div className="page">
      {/* Hero */}
      <div className="card-glass anim-up" style={{ padding:'32px 36px', marginBottom:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20, alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--role-accent)', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:20, height:1, background:'var(--role-accent)' }}/>
              My Clinic · Clinical AI
            </div>
            <div className="page-title">Good morning,<br/><span>{firstName}</span></div>
            <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:10, maxWidth:440, lineHeight:1.65 }}>
              Your AI ophthalmology workspace. Upload a fundus image for instant DR, AMD and glaucoma grading with explanability maps.
            </div>
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <Link href="/analyze"><button className="btn btn-primary btn-lg"><ScanLine size={15}/> New Scan</button></Link>
              <Link href="/patients"><button className="btn btn-outline btn-lg"><Users size={15}/> My Patients</button></Link>
            </div>
          </div>
          {/* Live mini-stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:160 }}>
            {[
              { v:stats?.total_cases??'—',  l:'Total scans' },
              { v:stats?.today??'—',         l:'Today' },
              { v:stats?.referable_cases??'—',l:'Need referral', alert:true },
            ].map(({ v,l,alert }:any) => (
              <div key={l} style={{ background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:alert?'var(--red)':'var(--role-accent)', lineHeight:1, minWidth:40 }}>{v}</div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--ink-4)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid anim-up-1">
        <StatTile val={stats?.total_cases}     label="Total Scans"   color="role"  icon={Activity} sub="All time" deltaUp delta={`${stats?.this_week??0} this week`}/>
        <StatTile val={stats?.today}           label="Scans Today"   color="lime"  icon={Eye}/>
        <StatTile val={stats?.referable_cases} label="Need Referral" color="red"   icon={AlertTriangle} sub="Require attention"/>
        <StatTile val={refStats?.urgent_open}  label="Urgent Open"   color="amber" icon={TrendingUp} sub="Pending action"/>
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:16, marginBottom:24 }} className="anim-up-2">
        <div className="card">
          <div className="card-head"><span className="card-title">DR Distribution</span>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:5,height:5,borderRadius:'50%',background:'var(--green)',animation:'pulse-dot 2s ease-in-out infinite' }}/><span style={{ fontFamily:'var(--f-mono)',fontSize:8,color:'var(--ink-4)' }}>Live</span></div>
          </div>
          <div style={{ padding:'16px 16px 8px' }}>
            {chart.length>0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chart} barSize={30}>
                  <XAxis dataKey="grade" tick={{ fontFamily:'var(--f-cond)',fontSize:9,fill:'var(--ink-4)',fontWeight:700 }} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{ background:'var(--bg-2)',border:'1px solid var(--border-2)',borderRadius:10,fontFamily:'var(--f-body)',fontSize:12,color:'var(--ink)' }} cursor={{ fill:'rgba(124,58,237,0.04)' }}/>
                  <Bar dataKey="count" radius={[5,5,0,0]}>
                    {chart.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ):(
              <div className="empty" style={{ padding:'32px 0' }}>
                <div className="empty-icon"><Activity size={18}/></div>
                <div className="empty-sub">No scans yet</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Referral Pipeline</span>
            <Link href="/referrals"><button className="btn btn-outline btn-xs">View all <ChevronRight size={10}/></button></Link>
          </div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {refStats?(['pending','sent','acknowledged','seen','completed'].map(s=>{
              const count=refStats.by_status?.[s]??0
              const max=Math.max(...Object.values(refStats.by_status||{}) as number[],1)
              const colors:any={pending:'var(--amber)',sent:'var(--blue)',acknowledged:'#8B5CF6',seen:'var(--amber)',completed:'var(--green)'}
              return (
                <div key={s}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5 }}>
                    <span className={`status-chip s-${s}`}>{s}</span>
                    <span style={{ fontFamily:'var(--f-display)',fontSize:18,color:'var(--ink)' }}>{count}</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width:`${(count/max)*100}%`,background:colors[s] }}/></div>
                </div>
              )
            })):(
              <div className="empty" style={{ padding:'24px 0' }}><div className="empty-sub">No referrals yet</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Recent scans */}
      <div className="card anim-up-3">
        <div className="card-head">
          <span className="card-title">Recent Scans</span>
          <Link href="/reports"><button className="btn btn-outline btn-xs">All reports <ChevronRight size={10}/></button></Link>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="pl-table">
            <thead><tr><th>#</th><th>Case</th><th>Patient</th><th>Date</th><th>Grade</th><th>Confidence</th><th>Referral</th><th></th></tr></thead>
            <tbody>
              {cases.length===0&&<tr><td colSpan={8}><div className="empty"><div className="empty-icon"><Eye size={18}/></div><div className="empty-title">No scans yet</div><div className="empty-sub">Upload your first retinal image</div><Link href="/analyze"><button className="btn btn-primary btn-sm" style={{ marginTop:6 }}><ScanLine size={12}/> Start scanning</button></Link></div></td></tr>}
              {cases.map((c:any,i:number)=>{
                const zone=c.dr_grade>=3?'zone-danger':c.dr_grade===2?'zone-warn':c.dr_grade===1?'zone-gold':'zone-lime'
                const conf=((c.dr_confidence||0)*100).toFixed(0)
                return (
                  <tr key={c.id} className={zone}>
                    <td className="rank">{i+1}</td>
                    <td><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.id?.slice(0,8)}</span></td>
                    <td style={{ fontWeight:600,color:'var(--ink)' }}>{c.patient_id}</td>
                    <td><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.created_at?.slice(0,10)}</span></td>
                    <td><GradeBadge grade={c.dr_grade??0}/></td>
                    <td><div style={{ display:'flex',alignItems:'center',gap:7 }}><div className="prog-bar" style={{ width:52 }}><div className="prog-fill" style={{ width:`${conf}%`,background:'linear-gradient(90deg,var(--green),#34D399)' }}/></div><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{conf}%</span></div></td>
                    <td>{c.dr_refer?<span className="status-chip s-pending">Refer</span>:<span style={{ fontFamily:'var(--f-mono)',fontSize:8,color:'var(--ink-4)' }}>—</span>}</td>
                    <td><Link href={`/reports?case=${c.id}`}><button className="btn btn-ghost btn-xs">View <ChevronRight size={10}/></button></Link></td>
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

// ── HOSPITAL DASHBOARD ───────────────────────────────────────────────────
function HospitalDashboard({ stats, refStats, cases, profile }: any) {
  const chart = Object.entries(stats?.dr_grade_distribution||{}).map(([g,c])=>({grade:DR_LABELS[+g]||`G${g}`,count:c as number,color:DR_COLORS[+g]||'#888'}))

  return (
    <div className="page">
      <div className="card-glass anim-up" style={{ padding:'28px 32px', marginBottom:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20 }}>
          <div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--role-accent)', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:20,height:1,background:'var(--role-accent)' }}/> Eye Department · Hospital AI
            </div>
            <div className="page-title">Department<br/><span>Command Centre</span></div>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:8, lineHeight:1.6 }}>Multi-doctor screening department. Manage your team's scan queue, triage pipeline and department KPIs.</div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <Link href="/triage"><button className="btn btn-primary btn-lg"><AlertTriangle size={14}/> Triage Queue</button></Link>
              <Link href="/batch"><button className="btn btn-outline btn-lg"><Layers size={14}/> Batch Screen</button></Link>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, minWidth:240 }}>
            {[
              { v:'8',                            l:'Doctors active' },
              { v:stats?.total_cases??'—',        l:'Total scans' },
              { v:stats?.today??'—',              l:'Today' },
              { v:stats?.referable_cases??'—',    l:'Need referral' },
            ].map(({ v,l })=>(
              <div key={l} style={{ background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:'10px 12px',textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-display)',fontSize:28,color:'var(--role-accent)',lineHeight:1 }}>{v}</div>
                <div style={{ fontFamily:'var(--f-cond)',fontSize:8,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ink-4)',marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-grid anim-up-1">
        <StatTile val="8"                         label="Team Members"   color="role"  icon={Users}/>
        <StatTile val={stats?.total_cases}        label="Total Scans"    color="lime"  icon={Activity} sub="All time"/>
        <StatTile val={stats?.referable_cases}    label="Need Referral"  color="red"   icon={AlertTriangle}/>
        <StatTile val={refStats?.urgent_open}     label="Urgent Triage"  color="amber" icon={AlertTriangle} sub="Immediate action"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:24 }} className="anim-up-2">
        <div className="card">
          <div className="card-head"><span className="card-title">DR Distribution</span></div>
          <div style={{ padding:'16px 16px 8px' }}>
            {chart.length>0?(<ResponsiveContainer width="100%" height={160}><BarChart data={chart} barSize={24}><XAxis dataKey="grade" tick={{ fontFamily:'var(--f-cond)',fontSize:8,fill:'var(--ink-4)',fontWeight:700 }} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{ background:'var(--bg-2)',border:'1px solid var(--border-2)',borderRadius:8,fontFamily:'var(--f-body)',fontSize:11,color:'var(--ink)' }} cursor={{ fill:'rgba(124,58,237,0.04)' }}/><Bar dataKey="count" radius={[4,4,0,0]}>{chart.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}</Bar></BarChart></ResponsiveContainer>):(<div className="empty" style={{ padding:'24px 0' }}><div className="empty-sub">No data</div></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Triage Queue</span><span className="status-chip u-urgent">3 Urgent</span></div>
          <div className="card-body" style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {[{p:'PAT-007',g:4,u:'urgent'},{p:'PAT-012',g:3,u:'priority'},{p:'PAT-003',g:3,u:'priority'}].map((item,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'var(--surface-2)',borderRadius:'var(--r-md)',border:'1px solid var(--border)' }}>
                <GradeBadge grade={item.g}/>
                <span style={{ flex:1,fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,color:'var(--ink-2)' }}>{item.p}</span>
                <span className={`status-chip u-${item.u}`}>{item.u}</span>
              </div>
            ))}
            <Link href="/triage"><button className="btn btn-outline btn-sm" style={{ width:'100%',justifyContent:'center',marginTop:4 }}>View full queue <ChevronRight size={12}/></button></Link>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Referral Pipeline</span></div>
          <div className="card-body" style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {refStats?(['pending','sent','completed'].map(s=>{const count=refStats.by_status?.[s]??0;const max=Math.max(...Object.values(refStats.by_status||{}) as number[],1);const colors:any={pending:'var(--amber)',sent:'var(--blue)',completed:'var(--green)'};return(<div key={s}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}><span className={`status-chip s-${s}`}>{s}</span><span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--ink)' }}>{count}</span></div><div className="prog-bar"><div className="prog-fill" style={{ width:`${(count/max)*100}%`,background:colors[s] }}/></div></div>)})):(
              <div className="empty" style={{ padding:'16px 0' }}><div className="empty-sub">No referrals</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Recent scans table */}
      <div className="card anim-up-3">
        <div className="card-head"><span className="card-title">Department Scans</span><Link href="/reports"><button className="btn btn-outline btn-xs">All reports <ChevronRight size={10}/></button></Link></div>
        <div style={{ overflowX:'auto' }}>
          <table className="pl-table">
            <thead><tr><th>#</th><th>Case</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Grade</th><th>Triage</th><th></th></tr></thead>
            <tbody>
              {cases.length===0&&<tr><td colSpan={8}><div className="empty"><div className="empty-sub">No scans yet</div></div></td></tr>}
              {cases.map((c:any,i:number)=>{const zone=c.dr_grade>=3?'zone-danger':c.dr_grade===2?'zone-warn':c.dr_grade===1?'zone-gold':'zone-lime';const urgency=c.dr_grade>=4?'critical':c.dr_grade>=3?'urgent':c.dr_grade>=2?'priority':'—';return(<tr key={c.id} className={zone}><td className="rank">{i+1}</td><td><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.id?.slice(0,8)}</span></td><td style={{ fontWeight:600,color:'var(--ink)' }}>{c.patient_id}</td><td><span style={{ fontFamily:'var(--f-cond)',fontSize:10,color:'var(--ink-3)' }}>Dr. Team</span></td><td><span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{c.created_at?.slice(0,10)}</span></td><td><GradeBadge grade={c.dr_grade??0}/></td><td>{urgency!=='—'?<span className={`status-chip u-${urgency}`}>{urgency}</span>:<span style={{ color:'var(--ink-4)',fontSize:10 }}>—</span>}</td><td><Link href={`/reports?case=${c.id}`}><button className="btn btn-ghost btn-xs">View <ChevronRight size={10}/></button></Link></td></tr>)})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── MINISTRY DASHBOARD ───────────────────────────────────────────────────
function MinistryDashboard({ stats, refStats }: any) {
  const dist = stats?.dr_grade_distribution || {}
  const total = Object.values(dist).reduce((a:any,b:any)=>a+b,0) as number || 1
  const prevalence = ((( (dist['2']||0) + (dist['3']||0) + (dist['4']||0) ) / total)*100).toFixed(1)

  return (
    <div className="page">
      <div className="card-glass anim-up" style={{ padding:'28px 32px', marginBottom:24 }}>
        <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--role-accent)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20,height:1,background:'var(--role-accent)' }}/> National Health Authority · Population Intelligence
        </div>
        <div className="page-title">National<br/><span>Screening Dashboard</span></div>
        <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:10, lineHeight:1.65 }}>
          Real-time DR prevalence data aggregated from all hospitals. Monitor screening coverage, referral compliance and generate WHO reports.
        </div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <Link href="/analytics"><button className="btn btn-primary btn-lg"><BarChart3 size={14}/> View Analytics</button></Link>
          <button className="btn btn-outline btn-lg"><Globe size={14}/> WHO Export</button>
        </div>
      </div>

      {/* National KPIs */}
      <div className="stat-grid anim-up-1">
        <StatTile val="24"                        label="Hospitals Online"  color="role"  icon={Activity}/>
        <StatTile val={stats?.total_cases??'—'}   label="National Scans"   color="lime"  icon={Eye} sub="All hospitals"/>
        <StatTile val={`${prevalence}%`}          label="DR Prevalence"    color="amber" icon={TrendingUp} sub="Referable rate"/>
        <StatTile val={stats?.referable_cases??'—'}label="Need Treatment"  color="red"   icon={AlertTriangle} sub="Referral required"/>
      </div>

      {/* Coverage + breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:24 }} className="anim-up-2">
        {[
          { label:'Screening Coverage', val:'33%', note:'vs 60% WHO target', color:'var(--amber)', accent:'var(--amber)' },
          { label:'Referral Compliance', val:'71%', note:'referred cases seen',  color:'var(--green)', accent:'var(--green)' },
          { label:'Coverage Gap',        val:'67%', note:'population unscreened', color:'var(--red)',   accent:'var(--red)' },
        ].map(({ label,val,note,color,accent })=>(
          <div key={label} className="card">
            <div style={{ height:2, background:accent }}/>
            <div className="card-body" style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--f-display)',fontSize:56,color,lineHeight:1,marginBottom:6 }}>{val}</div>
              <div style={{ fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-3)',marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hospital league table */}
      <div className="card anim-up-3">
        <div className="card-head">
          <span className="card-title">Hospital Performance</span>
          <Link href="/analytics"><button className="btn btn-outline btn-xs">Full report <ChevronRight size={10}/></button></Link>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="pl-table">
            <thead><tr><th>#</th><th>Hospital</th><th>Governorate</th><th>Scans</th><th>DR Prevalence</th><th>Referral Rate</th><th>Coverage</th></tr></thead>
            <tbody>
              {[
                { n:'Kasr El Aini Eye Dept',     gov:'Cairo',      scans:1240,prev:'22%',ref:'78%',cov:'41%' },
                { n:'Alex Main University Hosp', gov:'Alexandria', scans:980, prev:'18%',ref:'65%',cov:'35%' },
                { n:'Tanta Eye Centre',          gov:'Gharbia',    scans:720, prev:'31%',ref:'54%',cov:'28%' },
                { n:'Zagazig Teaching Hosp',     gov:'Sharqia',    scans:510, prev:'19%',ref:'71%',cov:'22%' },
              ].map((h,i)=>(
                <tr key={i}>
                  <td className="rank">{i+1}</td>
                  <td style={{ fontWeight:600,color:'var(--ink)' }}>{h.n}</td>
                  <td><span style={{ fontFamily:'var(--f-cond)',fontSize:10,color:'var(--ink-3)' }}>{h.gov}</span></td>
                  <td><span style={{ fontFamily:'var(--f-display)',fontSize:18,color:'var(--role-accent)' }}>{h.scans}</span></td>
                  <td><span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--amber)' }}>{h.prev}</span></td>
                  <td><span style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--green)' }}>{h.ref}</span></td>
                  <td>
                    <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                      <div className="prog-bar" style={{ width:52 }}><div className="prog-fill" style={{ width:h.cov,background:'var(--role-accent)' }}/></div>
                      <span style={{ fontFamily:'var(--f-mono)',fontSize:10,color:'var(--ink-4)' }}>{h.cov}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── ROUTER ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [profile, setProfile] = useState<ReturnType<typeof getProfile>>(null)
  const [stats,   setStats]   = useState<any>(null)
  const [refStats,setRefStats]= useState<any>(null)
  const [cases,   setCases]   = useState<any[]>([])

  useEffect(()=>{
    setProfile(getProfile())
    getCaseStats().then(setStats).catch(()=>{})
    getReferralStats().then(setRefStats).catch(()=>{})
    getCases({ limit:8 }).then(d=>setCases(d.cases||d)).catch(()=>{})
  },[])

  const role = (profile?.role||'clinic') as UserRole
  const props = { stats, refStats, cases, profile }

  if (role==='hospital') return <HospitalDashboard {...props}/>
  if (role==='ministry') return <MinistryDashboard {...props}/>
  return <ClinicDashboard {...props}/>
}
