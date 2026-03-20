'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCases, deleteCase, createPassport, createReferral } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Search, Share2, Trash2, ArrowLeftRight, Filter } from 'lucide-react'

const DR_LABELS  = ['No DR','Mild NPDR','Moderate NPDR','Severe NPDR','PDR']
const DR_COLORS  = ['#059669','#D97706','#EA580C','#DC2626','#9F1239']
const DR_CLASSES = ['g0','g1','g2','g3','g4']

export default function ReportsPage() {
  const params=useSearchParams()
  const [cases,setCases]    =useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]  =useState(params.get('patient')||'')
  const [gradeF,setGradeF]  =useState<number|null>(null)
  const [referF,setReferF]  =useState(false)
  const [selected,setSelected]=useState<string|null>(null)

  const load=()=>{
    setLoading(true)
    getCases({limit:100}).then(d=>setCases(d.cases||d)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const filtered=cases.filter(c=>{
    const s=!search||c.patient_id?.toLowerCase().includes(search.toLowerCase())||c.id?.includes(search)
    const g=gradeF===null||c.dr_grade===gradeF
    const r=!referF||c.dr_refer
    return s&&g&&r
  })
  const sel=selected?cases.find(c=>c.id===selected):null

  const handleDelete=async(id:string)=>{
    if(!confirm('Delete this case?'))return
    await deleteCase(id); toast.success('Deleted'); load()
    if(selected===id)setSelected(null)
  }
  const handlePassport=async(c:any)=>{
    const p=await createPassport({case_id:c.id,patient_id:c.patient_id,expires_days:30})
    navigator.clipboard.writeText(`${window.location.origin}/passport/${p.token}`)
    toast.success('Passport link copied!')
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 420px':'1fr', gap:20, padding:24, alignItems:'start' }}>
      <div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 }}>
          <div className="page-title">Scan<br/><span>Reports</span></div>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:12, color:'var(--ink-4)' }}>{filtered.length} results</div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, maxWidth:280 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
            <input className="field" style={{ paddingLeft:36 }} placeholder="Search patient / case…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {[0,1,2,3,4].map(g=>(
            <button key={g} className={`btn btn-sm ${gradeF===g?'btn-green':'btn-ghost'}`}
              style={{ color:gradeF===g?undefined:DR_COLORS[g] }}
              onClick={()=>setGradeF(gradeF===g?null:g)}>
              <span style={{ fontFamily:'var(--f-display)', fontSize:14 }}>G{g}</span>
            </button>
          ))}
          <button className={`btn btn-sm ${referF?'btn-danger':'btn-ghost'}`} onClick={()=>setReferF(r=>!r)}>
            <Filter size={12}/> Refer only
          </button>
        </div>

        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table className="pl-table">
              <thead>
                <tr><th>#</th><th>Case ID</th><th>Patient</th><th>Date</th><th>Grade</th><th>Confidence</th><th>Refer</th><th>Quality</th><th></th></tr>
              </thead>
              <tbody>
                {loading&&[...Array(5)].map((_,i)=>(
                  <tr key={i}>{[...Array(9)].map((_,j)=><td key={j}><div style={{ height:12, background:'var(--border)', borderRadius:4 }}/></td>)}</tr>
                ))}
                {!loading&&filtered.length===0&&(
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:48, color:'var(--ink-4)', fontFamily:'var(--f-cond)', letterSpacing:'0.08em' }}>No cases match filters</td></tr>
                )}
                {!loading&&filtered.map((c,i)=>{
                  const zone=c.dr_grade>=3?'zone-danger':c.dr_grade===2?'zone-warn':c.dr_grade===1?'zone-gold':'zone-lime'
                  const isSelected=selected===c.id
                  return (
                    <tr key={c.id} className={zone} onClick={()=>setSelected(isSelected?null:c.id)}
                      style={{ cursor:'pointer', background:isSelected?'var(--bg)':undefined }}>
                      <td className="rank">{i+1}</td>
                      <td><span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-3)' }}>{c.id?.slice(0,8)}</span></td>
                      <td style={{ fontWeight:600, color:'var(--ink)' }}>{c.patient_id}</td>
                      <td><span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-3)' }}>{c.created_at?.slice(0,10)}</span></td>
                      <td>
                        <span className={`grade-badge ${DR_CLASSES[c.dr_grade]||'g0'}`}>
                          <span className="gn">{c.dr_grade}</span>{DR_LABELS[c.dr_grade]||''}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="prog-bar" style={{ width:48 }}>
                            <div className="prog-fill" style={{ width:`${(c.dr_confidence||0)*100}%`, background:'var(--blue)' }}/>
                          </div>
                          <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>{((c.dr_confidence||0)*100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>{c.dr_refer?<span className="status-chip u-urgent">Refer</span>:<span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>—</span>}</td>
                      <td>
                        <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:(c.quality_adequate||c.quality_score>0.5)?'var(--green-mid)':'var(--amber)' }}>
                          {c.quality_adequate!==0?'✓ OK':'⚠ Low'}
                        </span>
                      </td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>handlePassport(c)} title="Create passport"><Share2 size={12}/></button>
                          <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(c.id)} title="Delete"><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Case detail panel */}
      {sel&&(
        <div style={{ position:'sticky', top:72 }}>
          <div className="card anim-up">
            <div style={{ height:3, background:`${DR_COLORS[sel.dr_grade]}`, opacity:0.7, borderRadius:'var(--r-xl) var(--r-xl) 0 0' }}/>
            <div className="card-head">
              <span className="card-title">Case Detail</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}>× Close</button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:96, letterSpacing:'0.02em', lineHeight:1, color:DR_COLORS[sel.dr_grade]||'var(--ink-4)' }}>
                  {sel.dr_grade}
                </div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:14, fontWeight:700, letterSpacing:'0.06em',
                  textTransform:'uppercase', color:DR_COLORS[sel.dr_grade], marginTop:4 }}>
                  {DR_LABELS[sel.dr_grade]||'Unknown'}
                </div>
              </div>
              {[
                ['Patient',sel.patient_id],
                ['Case ID',sel.id?.slice(0,12)],
                ['Date',sel.created_at?.slice(0,16)?.replace('T',' ')],
                ['Confidence',`${((sel.dr_confidence||0)*100).toFixed(1)}%`],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-light)' }}>
                  <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>{k}</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-2)' }}>{v}</span>
                </div>
              ))}
              {sel.full_result?.explainability?.gradcam_image&&(
                <img src={`data:image/png;base64,${sel.full_result.explainability.gradcam_image}`}
                  alt="Grad-CAM" style={{ width:'100%', borderRadius:'var(--r-sm)', marginTop:16, border:'1px solid var(--border)' }}/>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
                <button className="btn btn-primary" style={{ justifyContent:'center' }} onClick={()=>handlePassport(sel)}>
                  <Share2 size={14}/> Create Passport
                </button>
                <Link href={`/referrals?case=${sel.id}`}>
                  <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }}>
                    <ArrowLeftRight size={14}/> Create Referral
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
