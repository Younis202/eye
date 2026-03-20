'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { analyze, askCopilot, createPassport, downloadPdf } from '@/lib/api'
import { Copy, Share2, Download, Send, MessageSquare, X, Maximize2, Minimize2, Activity, Eye, Zap } from 'lucide-react'

const DR = {
  labels:    ['No Diabetic Retinopathy','Mild NPDR','Moderate NPDR','Severe NPDR','Proliferative DR'],
  short:     ['No DR','Mild','Moderate','Severe','PDR'],
  colors:    ['#059669','#D97706','#EA580C','#DC2626','#9F1239'],
  icd10:     ['Z01.00','H36.011','H36.012','H36.013','H36.014'],
  screening: ['Annual','12 months','3–6 months','4 weeks','Immediate'],
  urgency:   ['routine','routine','priority','urgent','critical'],
  action: [
    'No DR detected. Optimize glycemic control. Schedule annual screening.',
    'Mild changes. Optimize glycemic & BP control. Follow-up in 12 months.',
    'Refer to ophthalmologist within 3–6 months. Consider laser evaluation.',
    'Urgent ophthalmology referral within 4 weeks. Pan-retinal photocoagulation.',
    'Same-day emergency referral. Anti-VEGF treatment urgently required.',
  ],
}
const AMD_LABELS = ['No AMD','Early AMD','Intermediate AMD','Late AMD']
const AMD_COLORS = ['#059669','#D97706','#EA580C','#DC2626']
const LESIONS: Record<string,{icon:string;name:string;desc:string;color:string}> = {
  microaneurysm:      {icon:'●',name:'Microaneurysms',     desc:'Early vascular damage',  color:'#E84545'},
  hemorrhage:         {icon:'◉',name:'Hemorrhages',         desc:'Retinal bleeding',        color:'#FF2244'},
  hard_exudate:       {icon:'◈',name:'Hard Exudates',       desc:'Lipid leakage deposits', color:'#E8C068'},
  soft_exudate:       {icon:'◇',name:'Cotton-Wool Spots',  desc:'Nerve fiber ischemia',    color:'#F5A623'},
  neovascularization: {icon:'⬡',name:'Neovascularization', desc:'Abnormal vessel growth',  color:'#FF6B35'},
  drusen:             {icon:'◎',name:'Drusen Deposits',     desc:'AMD indicator',           color:'#A080D0'},
}
const STEPS = [
  {icon:'◈',label:'Quality Gate',       sub:'CLAHE + sharpness assessment'},
  {icon:'⬡',label:'RetinaViT Backbone', sub:'1024-dim patch embeddings'},
  {icon:'◉',label:'DR Classification',  sub:'5-class grading 0→4'},
  {icon:'◎',label:'AMD Detection',      sub:'Stage 0→3 screening'},
  {icon:'◇',label:'Glaucoma Screen',    sub:'Cup-to-disc ratio analysis'},
  {icon:'◆',label:'Lesion Mapping',     sub:'6 pathology types detected'},
  {icon:'▣',label:'Grad-CAM + Attn',   sub:'Visual explainability maps'},
  {icon:'◫',label:'Segmentation',       sub:'Vessel + optic disc masks'},
  {icon:'▤',label:'Report Generation',  sub:'Clinical findings + ICD-10'},
]
const QUICK_Q = [
  'Should I refer this patient urgently?',
  'What lesions are present and how severe?',
  'Explain why you gave this DR grade.',
  'Is the image quality reliable for diagnosis?',
  'What is the 12-month progression risk?',
  'What treatment protocol do you recommend?',
]
const VIS_TABS = [
  {id:'gradcam'   as const,label:'Grad-CAM',  sub:'Why this grade?'},
  {id:'attention' as const,label:'Attention', sub:'ViT focus map'},
  {id:'panel'     as const,label:'Full Panel',sub:'Combined view'},
  {id:'vessel'    as const,label:'Vessels',   sub:'SAM segmentation'},
  {id:'optic'     as const,label:'Optic Disc',sub:'CDR analysis'},
]

function Mono({children,color}:{children:React.ReactNode;color?:string}) {
  return <span style={{fontFamily:'var(--f-mono)',fontSize:10,color:color||'var(--ink-4)',letterSpacing:'0.06em'}}>{children}</span>
}
function SectionLabel({children}:{children:string}) {
  return (
    <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.18em',
      textTransform:'uppercase',color:'var(--ink-4)',marginBottom:10,
      display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:1,background:'var(--border)'}}/>{children}
      <div style={{flex:1,height:1,background:'var(--border)'}}/>
    </div>
  )
}
function ProbBar({label,pct,color,i}:{label:string;pct:number;color:string;i:number}) {
  return (
    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
      transition={{delay:i*0.08,duration:0.4}} style={{marginBottom:6}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color}}>G{i} {label}</span>
        <Mono color={color}>{pct.toFixed(1)}%</Mono>
      </div>
      <div style={{height:5,background:'var(--surface-2)',borderRadius:3,overflow:'hidden'}}>
        <motion.div initial={{width:0}} animate={{width:`${pct}%`}}
          transition={{delay:i*0.08+0.2,duration:0.8,ease:[0.16,1,0.3,1]}}
          style={{height:'100%',background:color,borderRadius:3}}/>
      </div>
    </motion.div>
  )
}
function UrgencyRing({grade,color,size=140}:{grade:number;color:string;size?:number}) {
  const r=size/2-6; const circ=2*Math.PI*r; const pct=grade/4
  return (
    <svg width={size} height={size} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-alt)" strokeWidth={4}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ-pct*circ}}
        transition={{delay:0.3,duration:1.2,ease:[0.16,1,0.3,1]}}/>
    </svg>
  )
}

export default function AnalyzePage() {
  const [file,setFile]=useState<File|null>(null)
  const [preview,setPreview]=useState<string|null>(null)
  const [pid,setPid]=useState('')
  const [pname,setPname]=useState('')
  const [eye,setEye]=useState<'OD'|'OS'>('OD')
  const [dragging,setDragging]=useState(false)
  const [phase,setPhase]=useState<'idle'|'scanning'|'done'>('idle')
  const [stepIdx,setStepIdx]=useState(-1)
  const [result,setResult]=useState<any>(null)
  const [activeImg,setActiveImg]=useState<'gradcam'|'attention'|'panel'|'vessel'|'optic'>('gradcam')
  const [msgs,setMsgs]=useState<any[]>([])
  const [q,setQ]=useState('')
  const [aiLoad,setAiLoad]=useState(false)
  const [passport,setPassport]=useState<any>(null)
  const [scanTime,setScanTime]=useState(0)
  const [copilotOpen,setCopilotOpen]=useState(false)
  const [copilotMaxi,setCopilotMaxi]=useState(false)
  const [activePanel,setActivePanel]=useState<'overview'|'visual'|'report'>('overview')
  const timerRef=useRef<any>(null)
  const fileRef=useRef<HTMLInputElement>(null)
  const msgsEnd=useRef<HTMLDivElement>(null)
  useEffect(()=>{msgsEnd.current?.scrollIntoView({behavior:'smooth'})},[msgs])
  useEffect(()=>{if(phase==='done'&&result)setTimeout(()=>setCopilotOpen(true),900)},[phase,result])

  const onFile=(f:File)=>{
    setFile(f);setPreview(URL.createObjectURL(f))
    setPhase('idle');setResult(null);setMsgs([]);setPassport(null);setStepIdx(-1);setCopilotOpen(false)
  }
  const onDrop=useCallback((e:React.DragEvent)=>{
    e.preventDefault();setDragging(false)
    const f=e.dataTransfer.files[0];if(f?.type.startsWith('image/'))onFile(f)
  },[])
  const runScan=async()=>{
    if(!file)return toast.error('Upload a retinal image first')
    setPhase('scanning');setStepIdx(0);setScanTime(0)
    timerRef.current=setInterval(()=>setScanTime(t=>t+0.1),100)
    for(let i=0;i<STEPS.length;i++){
      await new Promise(r=>setTimeout(r,480+Math.random()*200));setStepIdx(i+1)
    }
    const form=new FormData()
    form.append('file',file);form.append('patient_id',pid||'ANON')
    form.append('patient_name',pname);form.append('explain','true')
    try{
      const data=await analyze(form);clearInterval(timerRef.current)
      setResult(data);setPhase('done');toast.success('Analysis complete',{icon:'◉'})
    }catch{
      clearInterval(timerRef.current);setPhase('idle');setStepIdx(-1)
      toast.error('Backend unreachable — is it running on port 8000?')
    }
  }
  const ask=async(question:string)=>{
    if(!result||aiLoad||!question.trim())return
    setMsgs(m=>[...m,{role:'user',text:question}]);setQ('');setAiLoad(true)
    try{const res=await askCopilot(result.image_id,question);setMsgs(m=>[...m,{role:'ai',...res}])}
    catch{setMsgs(m=>[...m,{role:'ai',text:'AI Copilot unavailable. Check backend connection.'}])}
    finally{setAiLoad(false)}
  }
  const makePassport=async()=>{
    if(!result)return
    try{const p=await createPassport({case_id:result.image_id,patient_id:pid||'ANON',expires_days:30});setPassport(p);toast.success('Passport created!')}
    catch{toast.error('Failed to create passport')}
  }

  const dr=result?.dr_grading||{}; const amd=result?.amd||{}; const glau=result?.glaucoma||{}
  const qual=result?.quality||{}; const les=result?.lesions||{}; const rep=result?.report||{}
  const exp=result?.explainability||{}; const seg=result?.segmentation||{}
  const grade=dr.grade??0; const probs=(dr.probabilities||[]).map((p:number)=>p*100)
  const gradeColor=DR.colors[grade]||'var(--ink-4)'
  const presentLes=Object.entries(les).filter(([,v]:any)=>v.present)
  const visImages:Record<string,string|undefined>={
    gradcam:exp.gradcam_image,attention:exp.attention_image,
    panel:exp.explanation_panel,vessel:seg.vessel_mask,optic:seg.optic_disc_mask,
  }
  const copilotW=copilotMaxi?480:300
  const PANELS=[
    {id:'overview' as const,label:'Overview',     icon:<Activity size={12}/>},
    {id:'visual'   as const,label:'Explainability',icon:<Eye size={12}/>},
    {id:'report'   as const,label:'Report',        icon:<Zap size={12}/>},
  ]

  return (
    <>
      <div style={{height:'calc(100vh - var(--topbar-h))',display:'flex',overflow:'hidden',position:'relative'}}>

        {/* ══ COLUMN A ══ */}
        <div style={{width:300,flexShrink:0,borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{flex:'0 0 260px',position:'relative',background:'var(--surface-2)',
            cursor:preview?'default':'pointer',borderBottom:'1px solid var(--border)',overflow:'hidden'}}
            onClick={()=>!preview&&fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
            {preview?(
              <>
                <img src={preview} alt="Retina" style={{width:'100%',height:'100%',objectFit:'cover',
                  filter:phase==='scanning'?'brightness(0.7) saturate(0.5)':'none',transition:'filter 0.6s'}}/>
                {phase==='scanning'&&(
                  <div style={{position:'absolute',inset:0}}>
                    <div style={{position:'absolute',left:0,right:0,height:2,
                      background:'linear-gradient(90deg,transparent,var(--blue),var(--blue),transparent)',
                      boxShadow:'0 0 12px var(--blue)',animation:'scanline 1.6s ease-in-out infinite'}}/>
                    {[['0%','0%'],['0%','auto'],['auto','0%'],['auto','auto']].map(([t,b],i)=>(
                      <div key={i} style={{position:'absolute',
                        top:t==='0%'?8:undefined,bottom:b==='0%'?8:undefined,
                        left:i<2?8:undefined,right:i>=2?8:undefined,width:16,height:16,
                        borderTop:i<2?`2px solid var(--blue)`:undefined,
                        borderBottom:i>=2?`2px solid var(--blue)`:undefined,
                        borderLeft:i%2===0?`2px solid var(--blue)`:undefined,
                        borderRight:i%2!==0?`2px solid var(--blue)`:undefined}}/>
                    ))}
                  </div>
                )}
                {/* Grade ring overlay when done */}
                {phase==='done'&&(
                  <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)'}}>
                    <div style={{position:'relative',width:72,height:72}}>
                      <UrgencyRing grade={grade} color={gradeColor} size={72}/>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                        alignItems:'center',justifyContent:'center',
                        background:'rgba(255,255,255,0.9)',borderRadius:'50%',boxShadow:'var(--shadow-sm)'}}>
                        <span style={{fontFamily:'var(--f-display)',fontSize:26,lineHeight:1,color:gradeColor}}>{grade}</span>
                        <Mono color={gradeColor} style={{fontSize:7}}>DR</Mono>
                      </div>
                    </div>
                  </div>
                )}
                {phase!=='done'&&(
                  <div style={{position:'absolute',bottom:8,left:8,
                    background:'rgba(6,6,13,0.88)',border:`1px solid ${gradeColor}40`,
                    borderRadius:5,padding:'3px 10px',fontFamily:'var(--f-cond)',fontSize:11,
                    fontWeight:700,letterSpacing:'0.08em',color:'var(--blue)'}}>
                    {eye}
                  </div>
                )}
                <button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);setPhase('idle');setResult(null);setCopilotOpen(false)}}
                  style={{position:'absolute',top:8,right:8,background:'rgba(6,6,13,0.88)',
                    border:'1px solid var(--border)',borderRadius:4,color:'var(--ink-3)',
                    padding:'3px 9px',fontFamily:'var(--f-cond)',fontSize:10,cursor:'pointer'}}>× clear</button>
              </>
            ):(
              <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:10,
                border:dragging?'2px dashed var(--green)':'2px dashed var(--border)',
                transition:'border-color 0.2s',margin:8,borderRadius:'var(--r-sm)'}}>
                <div style={{fontSize:36,opacity:0.2}}>◎</div>
                <div style={{fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ink-4)'}}>Drop Retinal Image</div>
                <Mono>JPG · PNG · TIFF · BMP</Mono>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/>

          <div style={{padding:'12px 14px 8px',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              {[{label:'Name',placeholder:'Patient name',value:pname,onChange:(e:any)=>setPname(e.target.value)},
                {label:'ID',placeholder:'PAT-001',value:pid,onChange:(e:any)=>setPid(e.target.value)}].map(({label,placeholder,value,onChange})=>(
                <div key={label}>
                  <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-4)',marginBottom:4}}>{label}</div>
                  <input className="field" style={{padding:'7px 10px',fontSize:12}} placeholder={placeholder} value={value} onChange={onChange}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              {(['OD','OS'] as const).map(s=>(
                <button key={s} onClick={()=>setEye(s)} style={{flex:1,padding:'6px 0',
                  background:eye===s?'var(--green-light)':'transparent',
                  border:`1px solid ${eye===s?'rgba(0,200,83,0.35)':'var(--border)'}`,
                  borderRadius:6,color:eye===s?'var(--green-mid)':'var(--ink-4)',
                  fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.06em',cursor:'pointer',transition:'all 0.15s'}}>
                  {s==='OD'?'Right OD':'Left OS'}
                </button>
              ))}
            </div>
          </div>

          <div style={{padding:'12px 14px'}}>
            <button onClick={!file?()=>fileRef.current?.click():runScan} disabled={phase==='scanning'}
              className={`btn ${file&&phase!=='scanning'?'btn-green':'btn-outline'}`}
              style={{width:'100%',padding:'12px 0',
                ...(phase==='scanning'?{background:'var(--blue-light)',borderColor:'rgba(21,101,216,0.3)',color:'var(--blue)'}:{})}}>
              {!file?'SELECT IMAGE':phase==='scanning'?`SCANNING… ${scanTime.toFixed(1)}s`:phase==='done'?'RE-ANALYZE':'RUN AI ANALYSIS'}
            </button>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'0 14px 14px'}}>
            {(phase==='scanning'||phase==='done')&&(
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                {STEPS.map((s,i)=>{
                  const done=i<stepIdx; const active=i===stepIdx-1&&phase==='scanning'
                  const pending=!done&&!active
                  return (
                    <motion.div key={i} initial={{opacity:0,x:-8}}
                      animate={{opacity:pending&&phase!=='done'?0.3:1,x:0}} transition={{delay:i*0.04}}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:6,
                        transition:'all 0.25s',
                        background:active?'var(--blue-light)':done?'var(--green-light)':'transparent',
                        border:`1px solid ${active?'rgba(21,101,216,0.2)':done?'rgba(0,200,83,0.2)':'transparent'}`}}>
                      <div style={{width:18,height:18,borderRadius:'50%',flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,
                        background:done?'var(--green)':active?'var(--blue)':'var(--bg-alt)',
                        color:done||active?'#fff':'var(--ink-4)',
                        border:`1px solid ${done?'var(--green)':active?'var(--blue)':'var(--border)'}`}}>
                        {done?'✓':active?<span style={{animation:'spin 1s linear infinite',display:'block'}}>◌</span>:i+1}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.04em',
                          color:done?'var(--green-mid)':active?'var(--blue)':'var(--ink-3)',
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.label}</div>
                        <div style={{fontFamily:'var(--f-mono)',fontSize:8,color:'var(--ink-4)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.sub}</div>
                      </div>
                    </motion.div>
                  )
                })}
                {phase==='done'&&(
                  <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
                    style={{marginTop:8,padding:'8px 10px',borderRadius:6,
                      background:'var(--green-light)',border:'1px solid rgba(0,200,83,0.25)',
                      display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.06em',color:'var(--green-mid)'}}>COMPLETE</span>
                    <Mono color="var(--green-mid)">{result?.inference_time_ms?.toFixed(0)||'—'}ms</Mono>
                  </motion.div>
                )}
              </div>
            )}
            {phase==='idle'&&(
              <div style={{textAlign:'center',paddingTop:20}}>
                <div style={{fontFamily:'var(--f-display)',fontSize:40,color:'var(--border)',marginBottom:8}}>◎</div>
                <Mono>9 AI models ready</Mono>
              </div>
            )}
          </div>
        </div>

        {/* ══ COLUMN B ══ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Tab strip */}
          <AnimatePresence>
            {phase==='done'&&result&&(
              <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
                style={{display:'flex',alignItems:'center',borderBottom:'1px solid var(--border)',
                  background:'var(--surface)',padding:'0 20px',flexShrink:0,gap:4}}>
                {PANELS.map(p=>(
                  <button key={p.id} onClick={()=>setActivePanel(p.id)}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'11px 16px',
                      background:'transparent',border:'none',cursor:'pointer',
                      borderBottom:`2px solid ${activePanel===p.id?'var(--green)':'transparent'}`,
                      color:activePanel===p.id?'var(--green-mid)':'var(--ink-4)',
                      fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.08em',
                      textTransform:'uppercase',transition:'all 0.15s'}}>
                    {p.icon} {p.label}
                  </button>
                ))}
                <div style={{flex:1}}/>
                <Mono>{result.image_id?.slice(0,12)}</Mono>
                <div style={{marginLeft:8,padding:'3px 10px',borderRadius:'var(--r-pill)',
                  background:`${gradeColor}12`,border:`1px solid ${gradeColor}30`,
                  fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,
                  letterSpacing:'0.08em',color:gradeColor}}>
                  {DR.urgency[grade]}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{flex:1,overflowY:'auto'}}>
            <AnimatePresence mode="wait">

              {/* IDLE */}
              {phase==='idle'&&(
                <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  style={{height:'100%',minHeight:'calc(100vh - var(--topbar-h))',
                    display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:20}}>
                  <div style={{fontFamily:'var(--f-display)',fontSize:80,color:'var(--border)',lineHeight:1}}>◎</div>
                  <div style={{fontFamily:'var(--f-cond)',fontSize:12,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--ink-4)'}}>Upload a retinal image to begin</div>
                  <div style={{display:'flex',gap:24}}>
                    {['DR · AMD · Glaucoma','6 Lesion Types','Grad-CAM + Attention','Vessel Segmentation'].map(t=>(
                      <div key={t} style={{fontFamily:'var(--f-mono)',fontSize:9,color:'var(--ink-4)',letterSpacing:'0.06em'}}>✓ {t}</div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* SCANNING */}
              {phase==='scanning'&&(
                <motion.div key="scanning" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  style={{height:'100%',minHeight:'calc(100vh - var(--topbar-h))',
                    display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:24}}>
                  <div style={{position:'relative',width:160,height:160}}>
                    {[1,0.7,0.4].map((s,i)=>(
                      <div key={i} style={{position:'absolute',inset:`${i*20}px`,borderRadius:'50%',
                        border:`1px solid rgba(21,101,216,${s*0.35})`,
                        animation:`spin ${8+i*4}s linear infinite ${i%2?'reverse':''}`}}/>
                    ))}
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
                      <div style={{fontFamily:'var(--f-display)',fontSize:32,color:'var(--blue)'}}>{stepIdx}</div>
                      <Mono color="var(--blue)">of {STEPS.length}</Mono>
                    </div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'var(--f-cond)',fontSize:14,fontWeight:700,letterSpacing:'0.08em',color:'var(--blue)',marginBottom:4}}>
                      {STEPS[stepIdx-1]?.label||'Initializing…'}
                    </div>
                    <Mono>{STEPS[stepIdx-1]?.sub||''}</Mono>
                  </div>
                </motion.div>
              )}

              {/* OVERVIEW TAB */}
              {phase==='done'&&result&&activePanel==='overview'&&(
                <motion.div key="overview" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.2}}>
                  <div style={{padding:20,display:'flex',flexDirection:'column',gap:16}}>

                    {/* GRADE HERO */}
                    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
                      <div className="card" style={{border:`1px solid ${gradeColor}25`,overflow:'hidden',borderRadius:'var(--r-xl)'}}>
                        <div style={{height:3,background:`linear-gradient(90deg,${gradeColor},${gradeColor}60,transparent)`}}/>
                        <div style={{display:'grid',gridTemplateColumns:'210px 1fr'}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            padding:'28px 20px',borderRight:`1px solid ${gradeColor}15`,background:`${gradeColor}05`}}>
                            <div style={{position:'relative',width:140,height:140}}>
                              <UrgencyRing grade={grade} color={gradeColor} size={140}/>
                              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                                <motion.div initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}}
                                  transition={{delay:0.1,type:'spring',stiffness:200}}
                                  style={{fontFamily:'var(--f-display)',fontSize:72,lineHeight:1,color:gradeColor}}>{grade}</motion.div>
                                <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:gradeColor}}>DR Grade</div>
                              </div>
                            </div>
                            <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                              <span style={{fontFamily:'var(--f-mono)',fontSize:9,padding:'2px 7px',borderRadius:3,background:`${gradeColor}12`,border:`1px solid ${gradeColor}25`,color:gradeColor}}>{DR.icd10[grade]}</span>
                              <span style={{fontFamily:'var(--f-mono)',fontSize:9,padding:'2px 7px',borderRadius:3,background:'var(--surface)',color:'var(--ink-4)',border:'1px solid var(--border)'}}>{DR.screening[grade]}</span>
                            </div>
                          </div>
                          <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                            <div>
                              <div style={{fontFamily:'var(--f-cond)',fontSize:20,fontWeight:700,letterSpacing:'0.02em',color:'var(--ink)',marginBottom:4}}>{DR.labels[grade]}</div>
                              <div style={{fontSize:12,color:'var(--ink-3)',lineHeight:1.65,marginBottom:16}}>{DR.action[grade]}</div>
                              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                {dr.refer&&<span className="status-chip u-urgent">⚠ Refer</span>}
                                <span style={{fontFamily:'var(--f-mono)',fontSize:10,padding:'4px 10px',borderRadius:5,background:'var(--surface)',color:'var(--ink-3)',border:'1px solid var(--border)'}}>Conf: {((dr.confidence||0)*100).toFixed(1)}%</span>
                                <span style={{fontFamily:'var(--f-mono)',fontSize:10,padding:'4px 10px',borderRadius:5,background:'var(--surface)',color:'var(--ink-3)',border:'1px solid var(--border)'}}>{result.inference_time_ms?.toFixed(0)}ms</span>
                              </div>
                            </div>
                            <div>
                              <SectionLabel>Probability Profile</SectionLabel>
                              {probs.length>0?probs.map((p:number,i:number)=><ProbBar key={i} label={DR.short[i]} pct={p} color={DR.colors[i]} i={i}/>)
                                :<ProbBar label={DR.short[grade]} pct={(dr.confidence||0)*100} color={gradeColor} i={0}/>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* AMD + GLAUCOMA + QUALITY */}
                    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                        {[
                          {title:'Macular Degeneration',color:AMD_COLORS[amd.stage||0],big:amd.stage??0,sub:AMD_LABELS[amd.stage||0],mono:`Stage ${amd.stage??0} of 3`,pct:((amd.stage||0)/3)*100,conf:((amd.confidence||0)*100).toFixed(0),delay:0.4},
                          {title:'Glaucoma Screen',color:glau.suspect?'var(--red)':'var(--green)',big:(glau.cup_disc_ratio||0).toFixed(2),sub:glau.suspect?'Suspected':'Clear',mono:'CDR · normal <0.60',pct:Math.min((glau.cup_disc_ratio||0)/0.9*100,100),conf:((glau.confidence||0)*100).toFixed(0),delay:0.5},
                          {title:'Image Quality',color:qual.adequate?'var(--green)':'var(--amber)',big:((qual.score||0)*100).toFixed(0),sub:qual.adequate?'Adequate':'Suboptimal',mono:'0–100 scale',pct:(qual.score||0)*100,conf:qual.adequate?'✓ Gradable':'⚠ Retake',delay:0.6,noConf:true},
                        ].map(({title,color,big,sub,mono,pct,conf,delay,noConf}:any)=>(
                          <motion.div key={title} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay}}
                            className="card" style={{border:`1px solid ${color}20`,overflow:'hidden'}}>
                            <div style={{height:2,background:color,opacity:0.6}}/>
                            <div style={{padding:'14px 16px'}}>
                              <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--ink-4)',marginBottom:10}}>{title}</div>
                              <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:8}}>
                                <span style={{fontFamily:'var(--f-display)',fontSize:48,lineHeight:1,color}}>{big}</span>
                                <div>
                                  <div style={{fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,color}}>{sub}</div>
                                  <Mono>{mono}</Mono>
                                </div>
                              </div>
                              <div className="prog-bar">
                                <motion.div className="prog-fill" initial={{width:0}} animate={{width:`${pct}%`}}
                                  transition={{delay:delay+0.1,duration:0.8,ease:[0.16,1,0.3,1]}}
                                  style={{background:color}}/>
                              </div>
                              <div style={{marginTop:6}}><Mono color={noConf?color:undefined}>{noConf?conf:`Conf: ${conf}%`}</Mono></div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* LESION DETECTION */}
                    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
                      <div className="card" style={{overflow:'hidden'}}>
                        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--ink-3)'}}>Lesion Detection — 6 Pathology Types</span>
                          <Mono color={presentLes.length>0?'var(--red)':'var(--green-mid)'}>{presentLes.length} detected · {Object.keys(les).length-presentLes.length} clear</Mono>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)'}}>
                          {Object.entries(les).length>0
                            ?Object.entries(les).map(([key,val]:any,i)=>{
                              const info=LESIONS[key]||{icon:'●',name:key,desc:'',color:'var(--ink-4)'}
                              const pct=(val.probability||0)*100
                              return (
                                <motion.div key={key} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:0.3+i*0.06}}
                                  style={{padding:'14px 12px',textAlign:'center',borderRight:i<5?'1px solid var(--border)':undefined,
                                    background:val.present?`${info.color}08`:'transparent'}}>
                                  <div style={{fontSize:22,marginBottom:6,opacity:val.present?1:0.3}}>{info.icon}</div>
                                  <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:val.present?info.color:'var(--ink-4)',marginBottom:6,lineHeight:1.3}}>{info.name}</div>
                                  <div style={{fontFamily:'var(--f-display)',fontSize:24,color:val.present?info.color:'var(--ink-4)',opacity:val.present?1:0.4}}>
                                    {pct.toFixed(0)}<span style={{fontSize:10}}>%</span>
                                  </div>
                                  <div style={{height:2,background:'var(--border)',borderRadius:1,marginTop:6,overflow:'hidden'}}>
                                    <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:0.5+i*0.06,duration:0.6}}
                                      style={{height:'100%',background:val.present?info.color:'var(--border)',borderRadius:1}}/>
                                  </div>
                                  {val.present&&<div style={{fontFamily:'var(--f-mono)',fontSize:7,color:info.color,marginTop:4,letterSpacing:'0.06em'}}>DETECTED</div>}
                                  <div style={{fontFamily:'var(--f-mono)',fontSize:7,color:'var(--ink-4)',marginTop:2,lineHeight:1.4}}>{info.desc}</div>
                                </motion.div>
                              )
                            })
                            :Object.entries(LESIONS).map(([key,info],i)=>(
                              <div key={key} style={{padding:'14px 12px',textAlign:'center',borderRight:i<5?'1px solid var(--border)':undefined,opacity:0.4}}>
                                <div style={{fontSize:22,marginBottom:6}}>{info.icon}</div>
                                <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--ink-4)',marginBottom:6}}>{info.name}</div>
                                <div style={{fontFamily:'var(--f-display)',fontSize:24,color:'var(--ink-4)'}}>—</div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </motion.div>

                    {/* ACTIONS */}
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        <button className="btn btn-primary" onClick={makePassport}><Share2 size={14}/> Patient Passport</button>
                        <button className="btn btn-outline" onClick={async()=>{
                          if(!file)return
                          const form=new FormData();form.append('file',file);form.append('patient_id',pid||'ANON')
                          const blob=await downloadPdf(form)
                          const url=URL.createObjectURL(blob)
                          const a=document.createElement('a');a.href=url;a.download=`report_${result.image_id}.pdf`;a.click()
                        }}><Download size={14}/> Export PDF</button>
                        <button className="btn btn-outline" onClick={()=>{
                          navigator.clipboard.writeText(JSON.stringify({dr,amd,glaucoma:glau,quality:qual,lesions:les},null,2))
                          toast.success('Result JSON copied')
                        }}><Copy size={14}/> Copy JSON</button>
                        <button className="btn btn-ghost" onClick={()=>setCopilotOpen(true)}><MessageSquare size={14}/> AI Copilot</button>
                      </div>
                      {passport&&(
                        <div style={{marginTop:10,padding:'10px 14px',background:'var(--green-light)',border:'1px solid rgba(0,200,83,0.25)',borderRadius:'var(--r-sm)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <Mono color="var(--green-mid)">{typeof window!=='undefined'?`${window.location.origin}/passport/${passport.token}`:passport.share_url}</Mono>
                          <button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(passport.share_url);toast.success('Copied!')}}>Copy</button>
                        </div>
                      )}
                    </motion.div>
                    <div style={{height:80}}/>
                  </div>
                </motion.div>
              )}

              {/* VISUAL TAB */}
              {phase==='done'&&result&&activePanel==='visual'&&(
                <motion.div key="visual" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.2}}>
                  <div style={{padding:20}}>
                    <div className="card" style={{overflow:'hidden'}}>
                      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
                        {VIS_TABS.map(tab=>(
                          <button key={tab.id} onClick={()=>setActiveImg(tab.id)}
                            style={{flex:1,padding:'12px 8px',border:'none',background:activeImg===tab.id?'var(--white)':'transparent',
                              borderBottom:activeImg===tab.id?'2px solid var(--green)':'2px solid transparent',cursor:'pointer',transition:'all 0.15s'}}>
                            <div style={{fontFamily:'var(--f-cond)',fontSize:10,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:activeImg===tab.id?'var(--green-mid)':'var(--ink-4)'}}>{tab.label}</div>
                            <div style={{fontFamily:'var(--f-mono)',fontSize:8,color:'var(--ink-4)',marginTop:1}}>{tab.sub}</div>
                          </button>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 340px'}}>
                        <div style={{position:'relative',minHeight:320,borderRight:'1px solid var(--border)'}}>
                          <AnimatePresence mode="wait">
                            {visImages[activeImg]?(
                              <motion.img key={activeImg} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                src={`data:image/png;base64,${visImages[activeImg]}`} alt={activeImg} style={{width:'100%',display:'block'}}/>
                            ):(
                              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}}
                                style={{height:320,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
                                <div style={{fontSize:40,opacity:0.1}}>◎</div>
                                <Mono>{activeImg==='vessel'||activeImg==='optic'?'Run /segment for masks':'Not available in demo mode'}</Mono>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div style={{padding:16}}>
                          <SectionLabel>Thumbnails</SectionLabel>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,marginBottom:14}}>
                            {(['gradcam','attention','panel','vessel','optic'] as const).map(id=>(
                              <div key={id} onClick={()=>setActiveImg(id)} style={{cursor:'pointer',borderRadius:5,overflow:'hidden',
                                border:`1px solid ${activeImg===id?'var(--green)':'var(--border)'}`,transition:'border-color 0.15s',opacity:activeImg===id?1:0.6}}>
                                {visImages[id]?<img src={`data:image/png;base64,${visImages[id]}`} style={{width:'100%',display:'block',height:44,objectFit:'cover'}}/>
                                  :<div style={{height:44,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center'}}><Mono style={{fontSize:7}}>{id.slice(0,3)}</Mono></div>}
                              </div>
                            ))}
                          </div>
                          <SectionLabel>Interpretation</SectionLabel>
                          <div style={{fontSize:12,color:'var(--ink-4)',lineHeight:1.7}}>
                            {activeImg==='gradcam'&&'Gradient-weighted Class Activation Map highlights the retinal regions that drove the AI diagnosis. Red/orange = high importance for the assigned grade.'}
                            {activeImg==='attention'&&'RetinaViT self-attention weights per 14×14 patch grid. Shows where the transformer focused when building its retinal representation.'}
                            {activeImg==='panel'&&'4-panel combined view: original fundus, Grad-CAM overlay, attention map, and vessel segmentation for full visual audit trail.'}
                            {activeImg==='vessel'&&'Retina-SAM vessel segmentation. Green overlay marks retinal vascular tree — useful for neovascularization and caliber analysis.'}
                            {activeImg==='optic'&&`Optic disc (yellow) + cup (red) segmentation. CDR = ${(glau.cup_disc_ratio||0).toFixed(2)} — ${glau.suspect?'elevated, glaucoma suspected':'within normal range'}.`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* REPORT TAB */}
              {phase==='done'&&result&&activePanel==='report'&&(
                <motion.div key="report" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.2}}>
                  <div style={{padding:20,display:'flex',flexDirection:'column',gap:16}}>
                    {(rep.structured_findings||rep.recommendation||rep.full_text)?(
                      <div className="card" style={{padding:'20px 24px'}}>
                        <SectionLabel>Clinical Report</SectionLabel>
                        {rep.recommendation&&(
                          <div style={{borderLeft:`3px solid ${gradeColor}`,paddingLeft:16,marginBottom:16,fontSize:13,color:'var(--ink-2)',lineHeight:1.75}}>
                            <div style={{fontFamily:'var(--f-cond)',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:gradeColor,marginBottom:6}}>Recommendation</div>
                            {rep.recommendation}
                          </div>
                        )}
                        {rep.structured_findings&&(
                          <pre style={{fontFamily:'var(--f-body)',fontSize:12,color:'var(--ink-3)',lineHeight:1.75,whiteSpace:'pre-wrap',borderTop:'1px solid var(--border)',paddingTop:16}}>
                            {rep.structured_findings}
                          </pre>
                        )}
                      </div>
                    ):(
                      <div className="empty">
                        <div className="empty-icon" style={{margin:'0 auto 8px'}}><span style={{fontSize:22}}>◎</span></div>
                        <div className="empty-title">No report generated</div>
                      </div>
                    )}
                    <div style={{display:'flex',gap:10}}>
                      <button className="btn btn-primary" onClick={async()=>{
                        if(!file)return
                        const form=new FormData();form.append('file',file);form.append('patient_id',pid||'ANON')
                        const blob=await downloadPdf(form)
                        const url=URL.createObjectURL(blob)
                        const a=document.createElement('a');a.href=url;a.download=`report_${result.image_id}.pdf`;a.click()
                      }}><Download size={14}/> Export PDF</button>
                      <button className="btn btn-outline" onClick={()=>{navigator.clipboard.writeText(rep.full_text||rep.structured_findings||'');toast.success('Report copied')}}><Copy size={14}/> Copy Text</button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ══ FAB ══ */}
      <AnimatePresence>
        {phase==='done'&&!copilotOpen&&(
          <motion.button initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0,opacity:0}}
            transition={{type:'spring',stiffness:300,damping:22}}
            onClick={()=>setCopilotOpen(true)}
            style={{position:'fixed',bottom:28,right:28,zIndex:100,width:52,height:52,
              borderRadius:'50%',background:'var(--role-accent-dim)',border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-pl)'}}>
            <MessageSquare size={20} color="#00FF87"/>
            {msgs.filter(m=>m.role==='ai').length>0&&(
              <div style={{position:'absolute',top:-3,right:-3,width:16,height:16,borderRadius:'50%',
                background:'var(--red)',border:'2px solid var(--white)',fontFamily:'var(--f-mono)',
                fontSize:8,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                {msgs.filter(m=>m.role==='ai').length}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ══ COPILOT PANEL ══ */}
      <AnimatePresence>
        {copilotOpen&&(
          <motion.div initial={{x:copilotW+20,opacity:0}} animate={{x:0,opacity:1}} exit={{x:copilotW+20,opacity:0}}
            transition={{type:'spring',damping:26,stiffness:260}}
            style={{position:'fixed',top:'calc(var(--topbar-h) + 12px)',right:16,bottom:16,width:copilotW,
              background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-xl)',
              display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'var(--shadow-xl)',zIndex:90}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',background:'var(--role-accent-dim)',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontFamily:'var(--f-cond)',fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#fff'}}>AI Copilot</div>
                <div style={{fontFamily:'var(--f-mono)',fontSize:9,color:'rgba(255,255,255,0.5)',letterSpacing:'0.06em'}}>
                  {result?`Case ${result.image_id?.slice(0,8)}`:'Waiting for scan…'}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:result?'#00FF87':'rgba(255,255,255,0.3)',boxShadow:result?'0 0 6px #00FF87':undefined}}/>
                  <span style={{fontFamily:'var(--f-mono)',fontSize:9,color:result?'#00FF87':'rgba(255,255,255,0.5)',letterSpacing:'0.06em'}}>{result?'LIVE':'IDLE'}</span>
                </div>
                <button onClick={()=>setCopilotMaxi(m=>!m)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,color:'#fff',padding:'4px 7px',cursor:'pointer'}}>
                  {copilotMaxi?<Minimize2 size={11}/>:<Maximize2 size={11}/>}
                </button>
                <button onClick={()=>setCopilotOpen(false)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,color:'#fff',padding:'4px 7px',cursor:'pointer'}}>
                  <X size={11}/>
                </button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:10,background:'var(--surface-2)'}}>
              {msgs.length===0&&(
                <div style={{marginTop:'auto',paddingBottom:20,textAlign:'center'}}>
                  <div style={{fontSize:28,opacity:0.1,marginBottom:8}}>◎</div>
                  <div style={{fontFamily:'var(--f-cond)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--ink-4)'}}>{result?'Ask anything about this scan':'Run analysis first'}</div>
                </div>
              )}
              {msgs.map((m,i)=>(
                <motion.div key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                  className={m.role==='user'?'msg-user':'msg-ai'}>
                  {m.text}
                  {m.confidence!==undefined&&(
                    <div className="conf-bar" style={{marginTop:8}}>
                      <div className="conf-fill" style={{width:`${m.confidence*100}%`}}/>
                    </div>
                  )}
                  {m.suggestion&&(
                    <button onClick={()=>ask(m.suggestion)} style={{display:'block',marginTop:7,width:'100%',textAlign:'left',
                      background:'var(--green-light)',border:'1px solid rgba(0,200,83,0.2)',borderRadius:6,
                      padding:'5px 10px',fontSize:10,color:'var(--green-mid)',cursor:'pointer',fontFamily:'var(--f-body)',lineHeight:1.4}}>
                      → {m.suggestion}
                    </button>
                  )}
                </motion.div>
              ))}
              {aiLoad&&(
                <div style={{display:'flex',gap:4,padding:'4px 2px'}}>
                  {[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:'50%',background:'var(--role-accent-dim)',animation:`pulse-dot 1s ease-out ${j*0.2}s infinite`}}/>)}
                </div>
              )}
              <div ref={msgsEnd}/>
            </div>
            {result&&msgs.length<2&&(
              <div style={{padding:'0 10px 8px',display:'flex',flexDirection:'column',gap:4,background:'var(--surface-2)',borderTop:'1px solid var(--border)'}}>
                {QUICK_Q.slice(0,4).map(qq=>(
                  <button key={qq} onClick={()=>ask(qq)} style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:6,
                    background:'var(--surface)',color:'var(--ink-3)',fontSize:10,cursor:'pointer',fontFamily:'var(--f-body)',textAlign:'left',lineHeight:1.35,transition:'all 0.15s'}}
                    onMouseEnter={e=>{(e.currentTarget.style as any).borderColor='var(--pl)';(e.currentTarget.style as any).color='var(--pl)'}}
                    onMouseLeave={e=>{(e.currentTarget.style as any).borderColor='var(--border)';(e.currentTarget.style as any).color='var(--ink-3)'}}>
                    {qq}
                  </button>
                ))}
              </div>
            )}
            <div style={{padding:'8px 10px 12px',borderTop:'1px solid var(--border)',background:'var(--surface)'}}>
              <div style={{display:'flex',gap:6}}>
                <input className="field" style={{flex:1,padding:'8px 10px',fontSize:12}}
                  placeholder={result?'Ask about this scan…':'Waiting…'} value={q} disabled={!result}
                  onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)}/>
                <button className="btn btn-primary btn-sm" style={{padding:'8px 12px',flexShrink:0}}
                  onClick={()=>ask(q)} disabled={!q.trim()||!result}>
                  <Send size={13}/>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
