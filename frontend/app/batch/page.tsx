'use client'
import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'

const BASE = '/api/retina'
const DR_COLORS = ['var(--green)','var(--amber)','var(--amber)','var(--red)','var(--critical)']
const DR_LABELS = ['No DR','Mild','Moderate','Severe','PDR']

interface BatchFile { file: File; preview: string; status: 'queued'|'processing'|'done'|'error'; result?: any }

export default function BatchPage() {
  const [items,   setItems]   = useState<BatchFile[]>([])
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState(0)
  const [patientId, setPatId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: FileList) => {
    const newItems: BatchFile[] = Array.from(files).filter(f => f.type.startsWith('image/')).map(f => ({
      file: f, preview: URL.createObjectURL(f), status: 'queued',
    }))
    setItems(prev => [...prev, ...newItems])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }, [])

  const runBatch = async () => {
    if (items.length === 0) return toast.error('Add images first')
    setRunning(true); setDone(0)

    for (let i = 0; i < items.length; i++) {
      setItems(prev => prev.map((it,j) => j===i ? {...it, status:'processing'} : it))
      try {
        const form = new FormData()
        form.append('file', items[i].file)
        form.append('patient_id', patientId || `BATCH-${i+1}`)
        const { data } = await axios.post(`${BASE}/analyze`, form)
        setItems(prev => prev.map((it,j) => j===i ? {...it, status:'done', result:data} : it))
      } catch {
        setItems(prev => prev.map((it,j) => j===i ? {...it, status:'error'} : it))
      }
      setDone(d => d+1)
      await new Promise(r => setTimeout(r, 200))
    }
    setRunning(false)
    toast.success(`Batch complete — ${items.length} scans processed`)
  }

  const clear = () => { setItems([]); setDone(0) }

  const doneItems   = items.filter(i => i.status==='done')
  const referItems  = doneItems.filter(i => i.result?.dr_grading?.refer)

  return (
    <div className="page">
      <div style={{ fontFamily:'var(--f-display)', fontSize:48, letterSpacing:'0.04em', marginBottom:6, lineHeight:1 }}>
        BATCH<br /><span style={{ color:'var(--green)' }}>SCREENING</span>
      </div>
      <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-4)', marginBottom:28 }}>
        Upload multiple retinal images · Process sequentially · Export summary
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:20, alignItems:'start' }}>
        {/* Left */}
        <div>
          {/* Drop zone */}
          <div
            className="drop-zone"
            style={{ marginBottom:14 }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
          >
            <div style={{ fontSize:36, marginBottom:8, opacity:0.3 }}>⊞</div>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, letterSpacing:'0.08em', color:'var(--ink-2)', marginBottom:4 }}>DROP MULTIPLE IMAGES</div>
            <div style={{ fontSize:11, color:'var(--ink-4)' }}>or click · JPG, PNG, TIFF · unlimited files</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)} />

          <div style={{ marginBottom:14 }}>
            <label className="field-label">Patient ID (optional — applied to all)</label>
            <input className="field" placeholder="CLINIC-SESSION-01" value={patientId}
              onChange={e => setPatId(e.target.value)} />
          </div>

          {/* Progress */}
          {items.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)' }}>
                  Progress
                </span>
                <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-2)' }}>
                  {done}/{items.length}
                </span>
              </div>
              <div className="prog-bar" style={{ height:8 }}>
                <div className="prog-fill" style={{ width:`${(done/items.length)*100}%`, background:'var(--green)', transition:'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* Summary */}
          {doneItems.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'12px 16px' }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:'var(--green)' }}>{doneItems.length}</div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>Processed</div>
              </div>
              <div style={{ background:'var(--surface)', border:'1px solid rgba(232,69,69,0.3)', borderRadius:'var(--r-sm)', padding:'12px 16px' }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:'var(--red)' }}>{referItems.length}</div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>Need Referral</div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, flexDirection:'column' }}>
            <button className="btn btn-green btn-lg" style={{ justifyContent:'center' }}
              onClick={runBatch} disabled={running || items.length===0}>
              {running ? `◎ Processing ${done}/${items.length}…` : `◎ Run Batch (${items.length} images)`}
            </button>
            {items.length > 0 && (
              <button className="btn btn-ghost" style={{ justifyContent:'center' }} onClick={clear} disabled={running}>
                Clear All
              </button>
            )}
            {doneItems.length > 0 && (
              <button className="btn btn-ghost" style={{ justifyContent:'center' }} onClick={() => {
                const rows = doneItems.map(i => {
                  const dr = i.result?.dr_grading||{}
                  return `${i.file.name},${dr.grade||0},${dr.label||''},${((dr.confidence||0)*100).toFixed(1)}%,${dr.refer?'YES':'NO'}`
                })
                const csv = 'File,Grade,Label,Confidence,Refer\n' + rows.join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href=url; a.download='batch_results.csv'; a.click()
              }}>↓ Export CSV</button>
            )}
          </div>
        </div>

        {/* Right — results grid */}
        <div>
          {items.length === 0 ? (
            <div className="empty" style={{ paddingTop:60 }}>
              <div className="empty-icon">⊞</div>
              <div className="empty-title">No images added</div>
              <div className="empty-sub">Drop retinal images to start batch screening</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {items.map((item, i) => {
                const dr = item.result?.dr_grading || {}
                const grade = dr.grade ?? null
                return (
                  <div key={i} className="card" style={{ overflow:'hidden', transition:'all 0.2s' }}>
                    {/* Image */}
                    <div style={{ position:'relative', height:100, overflow:'hidden', background:'var(--surface)' }}>
                      <img src={item.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity: item.status==='processing' ? 0.5 : 1 }} />
                      {item.status === 'processing' && (
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--blue)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
                        </div>
                      )}
                      {/* Status overlay */}
                      <div style={{ position:'absolute', top:6, right:6 }}>
                        {item.status==='done'    && <span style={{ fontFamily:'var(--f-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(0,255,135,0.9)', color:'var(--bg)' }}>✓</span>}
                        {item.status==='error'   && <span style={{ fontFamily:'var(--f-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(232,69,69,0.9)', color:'var(--ink)' }}>✗</span>}
                        {item.status==='queued'  && <span style={{ fontFamily:'var(--f-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(0,0,0,0.6)', color:'var(--ink-3)' }}>—</span>}
                      </div>
                      {item.result?.dr_grading?.refer && (
                        <div style={{ position:'absolute', top:6, left:6 }}>
                          <span className="status-chip u-urgent" style={{ fontSize:8 }}>REFER</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.file.name}
                      </div>
                      {grade !== null ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'var(--f-display)', fontSize:24, color:DR_COLORS[grade], lineHeight:1 }}>{grade}</span>
                          <div>
                            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, color:DR_COLORS[grade] }}>{DR_LABELS[grade]}</div>
                            <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)' }}>{((dr.confidence||0)*100).toFixed(0)}%</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontFamily:'var(--f-cond)', fontSize:10, color:'var(--ink-4)', letterSpacing:'0.06em' }}>
                          {item.status === 'queued' ? 'Queued' : item.status === 'processing' ? 'Analyzing…' : 'Error'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
