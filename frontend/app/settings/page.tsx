'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { Wifi, Zap, FileCode, CheckCircle2 } from 'lucide-react'

const BASE = '/api/retina'

export default function SettingsPage() {
  const [clinic,   setClinic]   = useState('Cairo Ophthalmology Center')
  const [doctor,   setDoctor]   = useState('Dr. Ahmed Mostafa')
  const [apiUrl,   setApiUrl]   = useState('http://localhost:8000')
  const [apiKey,   setApiKey]   = useState('dev-secret-key')
  const [expires,  setExpires]  = useState('30')
  const [seeding,  setSeeding]  = useState(false)
  const [health,   setHealth]   = useState<any>(null)

  const checkHealth = async () => {
    try {
      const { data } = await axios.get(`${BASE}/health`)
      setHealth(data)
      toast.success('API is online!')
    } catch { toast.error('API unreachable') }
  }

  const seed = async () => {
    setSeeding(true)
    try {
      const { data } = await axios.post(`${BASE}/demo/seed`)
      toast.success(`${data.patients} patients seeded · ${data.referrals_created} referrals created`)
    } catch { toast.error('Seed failed') }
    finally { setSeeding(false) }
  }

  return (
    <div className="page page-sm">
      <div className="page-header anim-up">
        <div className="page-title">System<br /><span>Settings</span></div>
        <div className="page-subtitle" style={{ marginTop: 6 }}>Configure clinic profile, API and system preferences</div>
      </div>

      {/* Clinic Profile */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-head"><span className="card-title">Clinic Profile</span></div>
        <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label className="field-label">Clinic Name</label>
              <input className="field" value={clinic} onChange={e => setClinic(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Doctor / Admin Name</label>
              <input className="field" value={doctor} onChange={e => setDoctor(e.target.value)} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label className="field-label">Passport Expiry (days)</label>
              <input className="field" type="number" value={expires} onChange={e => setExpires(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Default Urgency</label>
              <select className="field">
                <option>routine</option>
                <option>priority</option>
                <option>urgent</option>
              </select>
            </div>
          </div>
          <button className="btn btn-green" style={{ alignSelf:'flex-start' }}
            onClick={() => toast.success('Settings saved')}>Save Profile</button>
        </div>
      </div>

      {/* API Connection */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-head">
          <span className="card-title">API Connection</span>
          {health && (
            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--green)', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block' }} />
              {health.status} · {health.model_loaded ? 'Model loaded' : 'Demo mode'}
            </span>
          )}
        </div>
        <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="field-label">Backend URL</label>
            <input className="field" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
          </div>
          <div>
            <label className="field-label">API Key</label>
            <input className="field" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-green" onClick={checkHealth}><Wifi size={14} /> Test Connection</button>
            <button className="btn btn-ghost" onClick={() => { setApiUrl('http://localhost:8000'); setApiKey('dev-secret-key') }}>Reset Defaults</button>
          </div>
          {health && (
            <div style={{ background:'var(--green-light)', border:'1px solid rgba(0,255,135,0.25)', borderRadius:'var(--r-sm)', padding:'12px 16px' }}>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--green)' }}>
                Status: {health.status} · Uptime: {health.uptime_seconds?.toFixed(0)}s · 
                Model: {health.model_loaded ? 'Loaded ✓' : 'Demo mode'} ·
                DB: {health.database_ok ? 'OK ✓' : 'Error'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demo Data */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-head"><span className="card-title">Demo & Testing</span></div>
        <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.6 }}>
            Seed the database with realistic demo patients and cases for investor demos.
            Generates 12 patients across all DR grades with referrals and progression data.
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-green" onClick={seed} disabled={seeding}>
              {seeding ? <><Zap size={14} /> Seeding…</> : <><Zap size={14} /> Load Demo Data</>}
            </button>
            <button className="btn btn-ghost" onClick={() => window.open(`${apiUrl}/docs`, '_blank')}>
              <FileCode size={14} /> API Docs
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <div className="card-head"><span className="card-title">System Information</span></div>
        <div className="card-body">
          {[
            ['Platform',       'RetinaGPT v3.0'],
            ['AI Models',      'Foundation Model (DINO + CLIP + SAM + TIME)'],
            ['Backbone',       'RetinaViT — fundus-aware Vision Transformer'],
            ['Diseases',       'DR · AMD · Glaucoma · 8 Lesion Types'],
            ['Explainability', 'Grad-CAM heatmaps'],
            ['Search',         'FAISS 1024-dim ANN semantic search'],
            ['Frontend',       'Next.js 14 · Bebas Neue · Barlow · JetBrains Mono'],
            ['Backend',        'FastAPI · SQLite · 33 endpoints'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border-light)' }}>
              <span style={{ fontFamily:'var(--f-cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>{k}</span>
              <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ink-2)', textAlign:'right', maxWidth:'60%' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
