'use client'
import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { searchSimilar } from '@/lib/api'
import { Search, Eye, Upload } from 'lucide-react'

const DR_COLORS = ['var(--green)','var(--amber)','var(--amber)','var(--red)','var(--critical)']
const DR_LABELS = ['No DR','Mild','Moderate','Severe','PDR']

export default function SearchPage() {
  const [file,    setFile]    = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging,setDragging]= useState(false)
  const [topK,    setTopK]    = useState(5)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults([])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('image/')) onFile(f)
  }, [])

  const run = async () => {
    if (!file) return toast.error('Upload an image first')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('top_k', String(topK))
      const data = await searchSimilar(form)
      setResults(data.results || [])
      if (!data.results?.length) toast('No similar cases found — build FAISS index first', { icon: 'ℹ' })
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <div style={{ fontFamily:'var(--f-display)', fontSize:48, letterSpacing:'0.04em', marginBottom:6, lineHeight:1 }}>
        SIMILAR<br /><span style={{ color:'var(--green)' }}>CASE SEARCH</span>
      </div>
      <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-4)', marginBottom:28 }}>
        FAISS semantic search · 1024-dim embeddings · Find visually similar retinal scans
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:24, alignItems:'start' }}>
        {/* Upload */}
        <div>
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            style={{ padding: preview ? 0 : undefined, overflow:'hidden', marginBottom:16 }}
            onClick={() => !preview && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {preview ? (
              <div style={{ position:'relative' }}>
                <img src={preview} alt="Query" style={{ width:'100%', display:'block', maxHeight:280, objectFit:'cover' }} />
                <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setResults([]) }}
                  style={{ position:'absolute', top:8, right:8, background:'rgba(6,6,13,0.85)', border:'1px solid var(--border)', borderRadius:6, color:'var(--ink-2)', padding:'3px 9px', fontFamily:'var(--f-cond)', fontSize:11, cursor:'pointer' }}>
                  Clear ×
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:10, opacity:0.3 }}>◎</div>
                <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, letterSpacing:'0.08em', color:'var(--ink-2)', marginBottom:4 }}>
                  DROP QUERY IMAGE
                </div>
                <div style={{ fontSize:11, color:'var(--ink-4)' }}>Find visually similar cases in the database</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />

          <div style={{ marginBottom:16 }}>
            <label className="field-label">Results (top-K)</label>
            <div style={{ display:'flex', gap:8 }}>
              {[3,5,10,20].map(k => (
                <button key={k} onClick={() => setTopK(k)}
                  className={topK===k ? 'btn btn-green btn-sm' : 'btn btn-ghost btn-sm'}
                  style={{ flex:1, justifyContent:'center' }}>{k}</button>
              ))}
            </div>
          </div>

          <button className="btn btn-green btn-lg" style={{ width:'100%', justifyContent:'center' }}
            onClick={run} disabled={!file || loading}>
            {loading ? '◎ Searching…' : '◎ Find Similar Cases'}
          </button>

          <div style={{ marginTop:16, padding:'12px 16px', background:'var(--border-light)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)' }}>
            <div style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--ink-4)', marginBottom:6, textTransform:'uppercase' }}>How it works</div>
            <div style={{ fontSize:11, color:'var(--ink-4)', lineHeight:1.7 }}>
              The query image is encoded by the RetinaViT backbone into a 1024-dim embedding vector.
              FAISS ANN search finds the most visually similar cases in the database.
              Useful for: second opinion, rare case comparison, training data validation.
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          {results.length === 0 && !loading && (
            <div className="empty" style={{ paddingTop:80 }}>
              <div className="empty-icon"><Search size={22} strokeWidth={1.5} /></div>
              <div className="empty-title">Results appear here</div>
              <div className="empty-sub">Upload a retinal image and run search</div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="section-head" style={{ marginBottom:16 }}>
                <span style={{ fontFamily:'var(--f-cond)', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)' }}>
                  {results.length} Similar Cases Found
                </span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {results.map((r: any, i: number) => {
                  const similarity = Math.round((r.similarity || 0) * 100)
                  const grade = r.dr_grade ?? 0
                  return (
                    <div key={r.case_id || i} className="card" style={{ display:'grid', gridTemplateColumns:'48px 1fr auto', gap:16, padding:'16px 20px', alignItems:'center' }}>
                      {/* Rank */}
                      <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:'var(--ink-4)', lineHeight:1, textAlign:'center' }}>
                        {i+1}
                      </div>

                      {/* Info */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                          <span style={{ fontFamily:'var(--f-display)', fontSize:24, color:DR_COLORS[grade], lineHeight:1 }}>{grade}</span>
                          <span style={{ fontFamily:'var(--f-cond)', fontSize:12, fontWeight:700, color:DR_COLORS[grade] }}>{DR_LABELS[grade]}</span>
                          {r.dr_refer && <span className="status-chip u-urgent">Refer</span>}
                        </div>
                        <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--ink-4)' }}>
                          Patient: {r.patient_id || '—'} · Case: {(r.case_id||'').slice(0,10)}
                          {r.created_at && ` · ${r.created_at.slice(0,10)}`}
                        </div>
                      </div>

                      {/* Similarity */}
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--f-display)', fontSize:32, lineHeight:1, color: similarity>85?'var(--green)':similarity>70?'var(--amber)':'var(--ink-3)' }}>
                          {similarity}%
                        </div>
                        <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--ink-4)', marginBottom:6, letterSpacing:'0.06em' }}>SIMILARITY</div>
                        <div className="prog-bar" style={{ width:80, marginLeft:'auto' }}>
                          <div className="prog-fill" style={{ width:`${similarity}%`, background: similarity>85?'var(--green)':similarity>70?'var(--amber)':'var(--ink-3)' }} />
                        </div>
                        {r.case_id && (
                          <Link href={`/reports?case=${r.case_id}`}>
                            <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }}>View →</button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
