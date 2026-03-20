'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

const DR_LABELS = ['No Diabetic Retinopathy', 'Mild Non-Proliferative DR', 'Moderate Non-Proliferative DR', 'Severe Non-Proliferative DR', 'Proliferative Diabetic Retinopathy']
const DR_COLORS = ['#00FF87', '#E8C068', '#F5A623', '#E84545', '#FF2244']
const DR_MSG = [
  'Your retina looks healthy. No signs of diabetic retinopathy were detected.',
  'Early signs detected. Schedule a follow-up with your doctor within 12 months.',
  'Moderate changes detected. Please see your ophthalmologist within 3 months.',
  'Significant changes detected. Urgent ophthalmology appointment recommended.',
  'Severe changes detected. Please contact your doctor immediately.',
]

const BASE = '/api/retina'

export default function PassportPage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return

    axios.get(`${BASE}/passport/${token}`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="passport-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 48, color: 'var(--lime)', letterSpacing: '0.06em' }}>RETINAGPT</div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--t4)', marginTop: 8 }}>Loading your report…</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="passport-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 48, color: 'var(--t4)', letterSpacing: '0.06em' }}>404</div>
        <div style={{ fontFamily: 'var(--f-cond)', fontSize: 18, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--t2)', margin: '16px 0 8px' }}>
          LINK EXPIRED
        </div>
        <div style={{ fontSize: 13, color: 'var(--t4)', lineHeight: 1.6 }}>
          This link has expired or is no longer valid. Contact your doctor for a new report link.
        </div>
      </div>
    </div>
  )

  const grade = data.dr_grade ?? 0
  const color = DR_COLORS[grade] || 'var(--t4)'
  const date = data.scan_date ? new Date(data.scan_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

  return (
    <div className="passport-page">
      {/* PL-style colored header */}
      <div className="passport-head">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 24, letterSpacing: '0.08em', color: color }}>
              RETINA<span style={{ color: 'var(--t1)' }}>GPT</span>
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
              PATIENT REPORT · {date}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--f-cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>
            Patient ID
          </div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 32, letterSpacing: '0.04em', color: 'var(--t1)' }}>
            {data.patient_id}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        {/* Grade hero */}
        <div style={{
          background: 'var(--stand)', border: `1px solid ${color}40`,
          borderRadius: 'var(--r20)', padding: '40px',
          textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontFamily: 'var(--f-cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--t4)', marginBottom: 16, textTransform: 'uppercase' }}>
            AI Diagnosis Result
          </div>
          <div className="passport-grade" style={{ color, marginBottom: 8 }}>{grade}</div>
          <div style={{ fontFamily: 'var(--f-cond)', fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', color, marginBottom: 16 }}>
            {DR_LABELS[grade]}
          </div>
          {data.dr_refer && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(232,69,69,0.12)', border: '1px solid rgba(232,69,69,0.3)',
              borderRadius: 'var(--r8)', padding: '8px 16px',
              fontFamily: 'var(--f-cond)', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.08em', color: 'var(--danger)', textTransform: 'uppercase',
            }}>
              ⚠ Ophthalmology Review Recommended
            </div>
          )}
        </div>

        {/* Plain language message */}
        <div style={{
          borderLeft: '3px solid var(--gold)', background: 'var(--gold-dim)',
          borderRadius: '0 var(--r12) var(--r12) 0', padding: '16px 20px', marginBottom: 24,
        }}>
          <div style={{ fontFamily: 'var(--f-cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: 8, textTransform: 'uppercase' }}>
            What This Means For You
          </div>
          <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.7 }}>
            {DR_MSG[grade]}
          </div>
        </div>

        {/* Grad-CAM */}
        {data.gradcam_image && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--f-cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 10 }}>
              AI Analysis — Highlighted Regions
            </div>
            <img
              src={`data:image/png;base64,${data.gradcam_image}`}
              alt="Retinal analysis"
              style={{ width: '100%', borderRadius: 'var(--r16)', border: '1px solid var(--b2)' }}
            />
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--t4)', marginTop: 8, lineHeight: 1.5 }}>
              The highlighted areas show where the AI focused when making its assessment.
            </div>
          </div>
        )}

        {/* Quality */}
        <div style={{
          background: 'var(--stand)', border: '1px solid var(--b2)', borderRadius: 'var(--r12)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: data.quality_adequate ? 'var(--lime-dim)' : 'rgba(232,69,69,0.1)',
            border: `1px solid ${data.quality_adequate ? 'rgba(0,255,135,0.3)' : 'rgba(232,69,69,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {data.quality_adequate ? '✓' : '⚠'}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--f-cond)', fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
              Image Quality: {data.quality_adequate ? 'Good' : 'Limited'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>
              {data.quality_adequate
                ? 'Your scan was clear and suitable for AI analysis.'
                : 'Image quality was limited. A repeat scan may provide more accurate results.'}
            </div>
          </div>
        </div>

        {/* Views */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--t4)' }}>
            Viewed {data.views} time{data.views !== 1 ? 's' : ''} · {date}
          </span>
        </div>

        {/* Disclaimer */}
        <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.7 }}>
            This report was generated by RetinaGPT AI and is intended to assist clinical decision-making.
            It does not replace the judgment of a qualified ophthalmologist. Please discuss these results with your doctor.
            Results are based on AI analysis of retinal fundus photography.
          </div>
        </div>
      </div>
    </div>
  )
}
