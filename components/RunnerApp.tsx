'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, CalendarDays, ChevronRight, Clock3, Download, Dumbbell,
  Gauge, Home, LogIn, Moon, Plus, Route, Settings, Sparkles, Sun, Target, Trash2,
  Trophy, UserRound, X
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { AppData, Feeling, Profile, Surface, Workout, WorkoutType } from '@/lib/types';
import { demoData } from '@/lib/demo';
import { loadLocal, resetDemo, saveLocal } from '@/lib/storage';
import {
  HM_DISTANCE, addDays, bestProjectionSource, dateRangeMileage, formatDuration,
  formatPace, generateInsights, isoDate, mondayOf, paceSeconds, parseDuration,
  personalRecords, riegelPrediction, rollingDailyMileage, sessionLoad, speedKmh,
  weeklyLongRuns, weeklyMileage
} from '@/lib/metrics';
import { hasSupabase, supabase } from '@/lib/supabase';

type View = 'home'|'workouts'|'progress'|'calendar'|'road'|'profile';

const NAV: {id:View; label:string; icon:any}[] = [
  {id:'home',label:'Inicio',icon:Home},{id:'workouts',label:'Entrenamientos',icon:Activity},
  {id:'progress',label:'Progreso',icon:BarChart3},{id:'calendar',label:'Calendario',icon:CalendarDays},
  {id:'road',label:'21K',icon:Route},{id:'profile',label:'Perfil',icon:UserRound}
];

const typeLabels: Record<WorkoutType,string> = {
  easy:'Carrera fácil',tempo:'Tempo',intervals:'Intervalos',long:'Fondo',recovery:'Recuperación',
  gym:'Gimnasio',test:'Carrera de prueba',race:'Competencia',other:'Otro'
};
const surfaceLabels: Record<Surface,string> = {treadmill:'Cinta',road:'Calle',track:'Pista',trail:'Trail'};
const feelingLabels: Record<Feeling,string> = {excellent:'Excelente',good:'Buena',normal:'Normal',heavy:'Pesada',very_hard:'Muy difícil'};

function todayIso(){ return isoDate(new Date()); }
function currencyless(n:number, digits=1){ return Number.isFinite(n) ? n.toFixed(digits) : '0.0'; }
function shortDate(s:string){ return new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short'}).format(new Date(`${s}T12:00:00`)); }
function weekLabel(s:string){ return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short'}).format(new Date(`${s}T12:00:00`)); }
function daysBetween(a:string,b:string){ return Math.ceil((new Date(b+'T12:00:00').getTime()-new Date(a+'T12:00:00').getTime())/86400000); }

const TooltipCard = ({active,payload,label}:any) => {
  if(!active || !payload?.length) return null;
  return <div className="chart-tooltip"><b>{label}</b>{payload.map((p:any)=><div key={p.dataKey} style={{marginTop:4}}>{p.name}: <strong>{p.value}</strong></div>)}</div>
};

export default function RunnerApp(){
  const [view,setView]=useState<View>('home');
  const [data,setData]=useState<AppData>(demoData);
  const [ready,setReady]=useState(false);
  const [dark,setDark]=useState(false);
  const [modal,setModal]=useState<'workout'|'detail'|null>(null);
  const [editing,setEditing]=useState<Workout|null>(null);
  const [detail,setDetail]=useState<Workout|null>(null);
  const [email,setEmail]=useState('');
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [syncMsg,setSyncMsg]=useState('');

  useEffect(()=>{ setData(loadLocal()); setReady(true); setDark(localStorage.getItem('21k-dark')==='1'); },[]);
  useEffect(()=>{ if(ready) saveLocal(data); },[data,ready]);
  useEffect(()=>{ document.documentElement.classList.toggle('dark',dark); if(ready)localStorage.setItem('21k-dark',dark?'1':'0'); },[dark,ready]);

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>setUserEmail(data.session?.user.email??null));
    const {data:sub}=supabase.auth.onAuthStateChange((_e,session)=>{ setUserEmail(session?.user.email??null); if(session) cloudPull(); });
    return ()=>sub.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const runs=useMemo(()=>data.workouts.filter(w=>w.sport==='run'),[data.workouts]);
  const weekly=useMemo(()=>weeklyMileage(runs),[runs]);
  const longRuns=useMemo(()=>weeklyLongRuns(runs),[runs]);
  const records=useMemo(()=>personalRecords(runs),[runs]);
  const insights=useMemo(()=>generateInsights(data.workouts),[data.workouts]);
  const rolling=useMemo(()=>rollingDailyMileage(runs,100),[runs]);
  const projectionSource=useMemo(()=>bestProjectionSource(runs),[runs]);
  const projection=projectionSource ? riegelPrediction(projectionSource.distance_km,projectionSource.duration_seconds) : null;
  const longest=records.longest?.distance_km||0;
  const progress=Math.min(100,(longest/HM_DISTANCE)*100);
  const daysLeft=Math.max(0,daysBetween(todayIso(),data.profile.race_date));
  const thisWeekStart=isoDate(mondayOf(new Date()));
  const thisWeek=weekly.find(w=>w.week===thisWeekStart)?.km||0;
  const prevWeek=weekly.find(w=>w.week===isoDate(addDays(mondayOf(new Date()),-7)))?.km||0;
  const last4=dateRangeMileage(runs,28);
  const recentRuns=[...runs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const recentPace=recentRuns.length?recentRuns.reduce((s,w)=>s+(paceSeconds(w.distance_km,w.duration_seconds)||0),0)/recentRuns.length:null;

  async function sendMagicLink(){
    if(!supabase){ setSyncMsg('Configura Supabase en .env.local para activar la cuenta y la nube.'); return; }
    if(!email.trim()) return;
    const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+window.location.pathname}});
    setSyncMsg(error?error.message:'Enlace enviado. Revisa tu correo.');
  }
  async function cloudPull(){
    if(!supabase) return;
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    setSyncMsg('Sincronizando…');
    const [w,p]=await Promise.all([
      supabase.from('runner_workouts').select('*').order('date',{ascending:true}),
      supabase.from('runner_profiles').select('*').maybeSingle()
    ]);
    if(!w.error && w.data?.length){
      setData(prev=>({...prev,workouts:w.data.map((x:any)=>({
        id:x.id,user_id:x.user_id,date:x.date,sport:x.sport,workout_type:x.workout_type,distance_km:Number(x.distance_km||0),
        duration_seconds:x.duration_seconds,average_hr:x.average_hr,max_hr:x.max_hr,rpe:x.rpe,elevation_gain:x.elevation_gain,
        treadmill_incline:x.treadmill_incline,surface:x.surface,calories:x.calories,cadence:x.cadence,notes:x.notes,pain:x.pain,
        sleep_quality:x.sleep_quality,feeling:x.feeling,strength_exercises:x.strength_exercises||null,created_at:x.created_at,updated_at:x.updated_at
      }))}));
    }
    if(!p.error && p.data){ setData(prev=>({...prev,profile:{name:p.data.name||'',race_date:p.data.race_date,race_distance:Number(p.data.race_distance||21.1),goal_time_seconds:p.data.goal_time_seconds,goal_weekly_distance:Number(p.data.goal_weekly_distance||30),goal_long_run:Number(p.data.goal_long_run||18)}})); }
    setSyncMsg('Sincronizado'); setTimeout(()=>setSyncMsg(''),1800);
  }
  async function cloudPush(next:AppData){
    if(!supabase || !userEmail) return;
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    const rows=next.workouts.map(w=>({...w,user_id:user.id}));
    await supabase.from('runner_workouts').upsert(rows,{onConflict:'id'});
    await supabase.from('runner_profiles').upsert({user_id:user.id,...next.profile},{onConflict:'user_id'});
  }
  function updateData(next:AppData){ setData(next); void cloudPush(next); }
  function saveWorkout(workout:Workout){
    const exists=data.workouts.some(w=>w.id===workout.id);
    const next={...data,workouts:exists?data.workouts.map(w=>w.id===workout.id?workout:w):[...data.workouts,workout]};
    if(!exists && workout.sport==='run'){
      const previousLongest=records.longest?.distance_km||0;
      const previousFastest=records.fastest?paceSeconds(records.fastest.distance_km,records.fastest.duration_seconds):Infinity;
      const currentPace=paceSeconds(workout.distance_km,workout.duration_seconds)||Infinity;
      if(workout.distance_km>previousLongest || currentPace<(previousFastest||Infinity)){setSyncMsg('🏆 Nuevo récord personal');setTimeout(()=>setSyncMsg(''),2800);}
    }
    updateData(next); setModal(null); setEditing(null);
  }
  async function deleteWorkout(id:string){
    if(!confirm('¿Eliminar este entrenamiento?'))return;
    const next={...data,workouts:data.workouts.filter(w=>w.id!==id)}; updateData(next); setModal(null); setDetail(null);
    if(supabase && userEmail) await supabase.from('runner_workouts').delete().eq('id',id);
  }
  function openEdit(w:Workout){ setEditing(w); setModal('workout'); }
  function openDetail(w:Workout){ setDetail(w); setModal('detail'); }

  function exportJson(){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='21k-progress.json';a.click();URL.revokeObjectURL(a.href);
  }
  function exportCsv(){
    const cols=['date','workout_type','distance_km','duration_seconds','pace','rpe','surface','notes'];
    const rows=runs.map(w=>[w.date,typeLabels[w.workout_type],w.distance_km,w.duration_seconds,formatPace(paceSeconds(w.distance_km,w.duration_seconds)),w.rpe??'',w.surface??'',(w.notes??'').replaceAll('"','""')]);
    const csv=[cols.join(','),...rows.map(r=>r.map(v=>`"${v}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='21k-progress.csv';a.click();URL.revokeObjectURL(a.href);
  }

  if(!ready) return null;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">21K Progress</div><div className="brand-sub">Tu camino hacia los 21,1 km</div>
      <nav className="nav">{NAV.map(n=>{const I=n.icon;return <button key={n.id} className={`nav-btn ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}><I size={18}/>{n.label}</button>})}</nav>
      <div className="sidebar-foot">
        <button className="btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>} {dark?'Modo claro':'Modo oscuro'}</button>
        <div className="tiny">Datos privados · exportación local disponible</div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><h1>{view==='home'?'Tu preparación':NAV.find(n=>n.id===view)?.label}</h1><p>Registrar → entender → comparar → progresar → llegar a 21,1 km.</p></div>
        <div className="actions"><button className="btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button><button className="btn primary" onClick={()=>{setEditing(null);setModal('workout')}}><Plus size={17}/> Registrar entrenamiento</button></div>
      </header>

      <AuthBanner email={email} setEmail={setEmail} userEmail={userEmail} send={sendMagicLink} sync={cloudPull} syncMsg={syncMsg}/>

      {view==='home' && <Dashboard runs={runs} weekly={weekly} longest={longest} progress={progress} daysLeft={daysLeft} thisWeek={thisWeek} prevWeek={prevWeek} last4={last4} recentPace={recentPace} openDetail={openDetail} goWorkouts={()=>setView('workouts')}/>}      
      {view==='workouts' && <WorkoutsView workouts={[...data.workouts].sort((a,b)=>b.date.localeCompare(a.date))} openEdit={openEdit} openDetail={openDetail} deleteWorkout={deleteWorkout}/>}      
      {view==='progress' && <ProgressView data={data} runs={runs} weekly={weekly} longRuns={longRuns} rolling={rolling} records={records} insights={insights} projection={projection} projectionSource={projectionSource}/>}      
      {view==='calendar' && <CalendarView workouts={data.workouts} openDetail={openDetail}/>}      
      {view==='road' && <RoadView profile={data.profile} longest={longest} projection={projection}/>}      
      {view==='profile' && <ProfileView data={data} setData={updateData} exportJson={exportJson} exportCsv={exportCsv} reset={()=>{if(confirm('¿Restaurar los datos demo?'))setData(resetDemo())}}/>}
    </main>

    <nav className="bottom-nav">{NAV.map(n=>{const I=n.icon;return <button key={n.id} className={view===n.id?'active':''} onClick={()=>setView(n.id)}><I size={19}/><span>{n.label}</span></button>})}</nav>
    {modal==='workout' && <WorkoutModal initial={editing} onClose={()=>{setModal(null);setEditing(null)}} onSave={saveWorkout}/>}    
    {modal==='detail' && detail && <DetailModal workout={detail} runs={runs} onClose={()=>{setModal(null);setDetail(null)}} onEdit={()=>{setModal(null);openEdit(detail)}} onDelete={()=>deleteWorkout(detail.id)}/>}  
  </div>
}

function AuthBanner({email,setEmail,userEmail,send,sync,syncMsg}:any){
  return <div className="auth-banner">
    <div><b>{userEmail?`Nube activa · ${userEmail}`:hasSupabase?'Modo local · inicia sesión para sincronizar':'Modo demo/local'}</b><div className="tiny">{hasSupabase?'Mismas actividades en todos tus dispositivos.':'El MVP funciona sin nube. Conecta Supabase cuando quieras sincronizar.'}</div></div>
    <div className="actions">{hasSupabase && !userEmail && <><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Tu correo electrónico" type="email"/><button className="btn primary" onClick={send}><LogIn size={16}/> Enviar enlace</button></>}{userEmail&&<button className="btn" onClick={sync}>Sincronizar</button>}{syncMsg&&<span className="tiny" style={{alignSelf:'center'}}>{syncMsg}</span>}</div>
  </div>
}

function Dashboard({runs,weekly,longest,progress,daysLeft,thisWeek,prevWeek,last4,recentPace,openDetail,goWorkouts}:any){
  const chartWeekly=weekly.slice(-10).map((x:any)=>({...x,label:weekLabel(x.week)}));
  const delta=prevWeek>0?((thisWeek-prevWeek)/prevWeek)*100:0;
  const milestones=[5,7,10,12,15,16,18,21.1];
  const nextMilestone=milestones.find(m=>m>longest)??21.1;
  const recent=[...runs].sort((a:Workout,b:Workout)=>b.date.localeCompare(a.date)).slice(0,3);

  return <div className="grid home-dashboard" style={{gap:18}}>
    <section className="grid metrics">
      <Metric label="Objetivo" value="21,1 km" help={`Carrera en ${daysLeft} días`}/>
      <Metric label="Mayor fondo" value={`${longest.toFixed(1)} km`} help={`${progress.toFixed(0)}% de la distancia`}/>
      <Metric label="Esta semana" value={`${thisWeek.toFixed(1)} km`} help={`${delta>=0?'+':''}${delta.toFixed(1)}% vs. semana anterior`}/>
      <Metric label="Ritmo reciente" value={formatPace(recentPace)} help={`${last4.toFixed(1)} km en 28 días`}/>
    </section>

    <section className="grid two home-core">
      <Panel title="Kilómetros semanales" subtitle="Volumen de carrera de lunes a domingo">
        <div className="chart"><ResponsiveContainer><BarChart data={chartWeekly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" interval="preserveStartEnd" minTickGap={22} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Bar dataKey="km" name="Kilómetros" fill="#2563eb" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div>
      </Panel>

      <Panel title="Camino a 21K" subtitle="Tu mayor distancia registrada">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',marginBottom:12}}>
          <div><div style={{fontSize:40,fontWeight:950,letterSpacing:'-.06em'}}>{longest.toFixed(1)} km</div><div className="tiny">de 21,1 km</div></div>
          <div style={{fontWeight:900,color:'var(--green)'}}>{progress.toFixed(0)}%</div>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
        <div className="road">{milestones.map(x=><span key={x} className={`milestone ${longest>=x?'done':''}`}>{longest>=x?'✓':'○'} {x} km</span>)}</div>
        <div className="next-goal">
          <span>Próximo objetivo</span>
          <strong>{nextMilestone.toFixed(nextMilestone%1?1:0)} km</strong>
          <small>Faltan {Math.max(0,nextMilestone-longest).toFixed(1)} km</small>
        </div>
      </Panel>
    </section>

    <Panel title="Actividad reciente" subtitle="Tus últimos tres entrenamientos" right={<button className="text-action" onClick={goWorkouts}>Ver todos →</button>}>
      <WorkoutTable workouts={recent} onClick={openDetail}/>
    </Panel>
  </div>
}

function Metric({label,value,help}:{label:string;value:string;help:string}){return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-help">{help}</div></div>}
function Panel({title,subtitle,children,right}:{title:string;subtitle?:string;children:React.ReactNode;right?:React.ReactNode}){return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{subtitle&&<div className="panel-sub">{subtitle}</div>}</div>{right}</div>{children}</section>}

function WorkoutTable({workouts,onClick,onEdit,onDelete}:{workouts:Workout[];onClick?:(w:Workout)=>void;onEdit?:(w:Workout)=>void;onDelete?:(id:string)=>void}){
  if(!workouts.length)return <div className="empty">Aún no hay entrenamientos.</div>;
  return <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Distancia</th><th>Tiempo</th><th>Ritmo</th><th>RPE</th>{(onEdit||onDelete)&&<th/>}</tr></thead><tbody>{workouts.map(w=><tr key={w.id} className={onClick?'clickable':''} onClick={()=>onClick?.(w)}><td>{shortDate(w.date)}</td><td className="row-title"><span className="status-dot" style={{background:w.workout_type==='long'?'var(--orange)':w.sport==='strength'?'var(--violet)':'var(--blue)'}}/>{typeLabels[w.workout_type]}</td><td>{w.sport==='run'?`${w.distance_km.toFixed(1)} km`:'—'}</td><td>{formatDuration(w.duration_seconds)}</td><td>{w.sport==='run'?formatPace(paceSeconds(w.distance_km,w.duration_seconds)):'—'}</td><td>{w.rpe??'—'}</td>{(onEdit||onDelete)&&<td onClick={e=>e.stopPropagation()}><div className="actions"><button className="btn" onClick={()=>onEdit?.(w)}>Editar</button><button className="btn danger" onClick={()=>onDelete?.(w.id)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table></div>
}

function WorkoutsView({workouts,openEdit,openDetail,deleteWorkout}:any){
  const [filter,setFilter]=useState<'all'|WorkoutType>('all');
  const filtered=filter==='all'?workouts:workouts.filter((w:Workout)=>w.workout_type===filter);
  return <div className="grid" style={{gap:16}}><Panel title="Historial de entrenamientos" subtitle={`${filtered.length} registros`} right={<div className="tabs"><button className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Todos</button>{(['easy','tempo','intervals','long','gym','race'] as WorkoutType[]).map(t=><button key={t} className={`chip ${filter===t?'active':''}`} onClick={()=>setFilter(t)}>{typeLabels[t]}</button>)}</div>}><WorkoutTable workouts={filtered} onClick={openDetail} onEdit={openEdit} onDelete={deleteWorkout}/></Panel></div>
}

function ProgressView({data,runs,weekly,longRuns,rolling,records,insights,projection,projectionSource}:any){
  const [paceFilter,setPaceFilter]=useState<'all'|WorkoutType>('all');
  const paceData=[...runs]
    .filter((w:Workout)=>paceFilter==='all'||w.workout_type===paceFilter)
    .sort((a:Workout,b:Workout)=>a.date.localeCompare(b.date))
    .map((w:Workout)=>({date:shortDate(w.date),pace:+((paceSeconds(w.distance_km,w.duration_seconds)||0)/60).toFixed(2)}));

  const distribution=Object.entries(runs.reduce((m:any,w:Workout)=>{
    m[w.workout_type]=(m[w.workout_type]||0)+1;
    return m
  },{})).map(([name,value])=>({name:typeLabels[name as WorkoutType],value}));

  const colors=['#2563eb','#16a34a','#f97316','#7c3aed','#0ea5e9','#64748b'];
  const weeklyChart=weekly.map((x:any)=>({...x,label:weekLabel(x.week)}));
  const longChart=longRuns.map((x:any)=>({...x,label:weekLabel(x.week)}));
  const loadData=[...data.workouts]
    .sort((a:Workout,b:Workout)=>a.date.localeCompare(b.date))
    .slice(-28)
    .map((w:Workout)=>({date:shortDate(w.date),load:sessionLoad(w)}));

  return <div className="grid progress-dashboard" style={{gap:16}}>
    <section className="grid equal">
      <Panel title="Promedio móvil de kilometraje" subtitle="Promedio diario de 7, 28 y 42 días">
        <div className="chart"><ResponsiveContainer><LineChart data={rolling}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={(v)=>shortDate(v)} minTickGap={28} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Line dataKey="ma7" name="7 días" stroke="#2563eb" dot={false}/><Line dataKey="ma28" name="28 días" stroke="#16a34a" dot={false}/><Line dataKey="ma42" name="42 días" stroke="#f97316" dot={false}/></LineChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Distribución del entrenamiento" subtitle="Porcentaje de sesiones de carrera">
        <div className="chart"><ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{distribution.map((_:any,i:number)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip content={<TooltipCard/>}/><Legend/></PieChart></ResponsiveContainer></div>
      </Panel>
    </section>

    <Panel title="Kilómetros por semana" subtitle="Tendencia del volumen total">
      <div className="chart"><ResponsiveContainer><AreaChart data={weeklyChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" minTickGap={24} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Area dataKey="km" name="km" stroke="#2563eb" fill="#2563eb22" strokeWidth={3}/></AreaChart></ResponsiveContainer></div>
    </Panel>

    <section className="grid equal">
      <Panel title="Evolución del ritmo" subtitle="Menos min/km representa mayor velocidad" right={<select className="chip" value={paceFilter} onChange={e=>setPaceFilter(e.target.value as any)}><option value="all">Todos</option>{(['easy','tempo','intervals','long','race'] as WorkoutType[]).map(t=><option key={t} value={t}>{typeLabels[t]}</option>)}</select>}>
        <div className="chart"><ResponsiveContainer><LineChart data={paceData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" minTickGap={24} tick={{fontSize:10}}/><YAxis reversed tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Line dataKey="pace" name="min/km" stroke="#16a34a" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Evolución del fondo" subtitle="Referencia visual: 21,1 km">
        <div className="chart"><ResponsiveContainer><BarChart data={longChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" minTickGap={24} tick={{fontSize:10}}/><YAxis domain={[0,22]} tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Bar dataKey="km" name="Fondo km" fill="#f97316" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
      </Panel>
    </section>

    <Panel title="Carga de entrenamiento" subtitle="Minutos × RPE. Tendencia descriptiva, no diagnóstico.">
      <div className="chart"><ResponsiveContainer><AreaChart data={loadData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" minTickGap={24} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip content={<TooltipCard/>}/><Area type="monotone" dataKey="load" name="Carga" stroke="#7c3aed" fill="#7c3aed22" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
    </Panel>

    <Panel title="Lo que muestran tus datos" subtitle="Insights calculados a partir de tus registros">
      <div className="insights">{insights.map((x:string,i:number)=><div className="insight" key={i}><Sparkles size={17} color="var(--blue)"/><span>{x}</span></div>)}</div>
      {projection&&<div className="projection-card"><div className="metric-label">Proyección 21,1 km</div><div className="metric-value" style={{fontSize:29}}>{formatDuration(projection)}</div><div className="metric-help">Basada en {projectionSource.distance_km.toFixed(1)} km recientes · ritmo estimado {formatPace(projection/HM_DISTANCE)}</div><div className="projection-note">Estimación basada en tus resultados recientes; no es una garantía de rendimiento.</div></div>}
    </Panel>

    <Panel title="Curva de rendimiento por distancia" subtitle="Mejores equivalentes registrados a partir de tus actividades">
      <div className="record-grid">{records.curve.map((r:any)=><div className="record" key={r.distance}><span>{r.distance===HM_DISTANCE?'21,1':r.distance} km</span><b>{r.seconds?formatDuration(r.seconds):'—'}</b><span>{r.seconds?formatPace(r.seconds/r.distance):'Sin dato suficiente'}</span></div>)}</div>
    </Panel>
  </div>
}

function CalendarView({workouts,openDetail}:any){
  const [cursor,setCursor]=useState(new Date()); const year=cursor.getFullYear(),month=cursor.getMonth();
  const first=new Date(year,month,1), start=(first.getDay()+6)%7, days=new Date(year,month+1,0).getDate();
  const cells=Array.from({length:42},(_,i)=>{const d=i-start+1;return d>=1&&d<=days?new Date(year,month,d):null});
  const grouped=new Map<string,Workout[]>();workouts.forEach((w:Workout)=>{const arr=grouped.get(w.date)||[];arr.push(w);grouped.set(w.date,arr)});
  return <Panel title={new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(cursor)} subtitle="Carrera, fondo, gimnasio y recuperación" right={<div className="actions"><button className="btn" onClick={()=>setCursor(new Date(year,month-1,1))}>Anterior</button><button className="btn" onClick={()=>setCursor(new Date())}>Hoy</button><button className="btn" onClick={()=>setCursor(new Date(year,month+1,1))}>Siguiente</button></div>}><div className="calendar">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div className="cal-head" key={d}>{d}</div>)}{cells.map((d,i)=>{if(!d)return <div className="day empty" key={i}/>;const key=isoDate(d);const ev=grouped.get(key)||[];return <div className="day" key={key}><div className="day-num">{d.getDate()}</div>{ev.slice(0,3).map(w=><div className={`event ${w.workout_type==='long'?'long':w.sport==='strength'?'strength':'run'}`} key={w.id} onClick={()=>openDetail(w)}>{w.sport==='strength'?'🏋️ Gym':`🏃 ${w.distance_km.toFixed(1)} km${w.workout_type==='long'?' Fondo':''}`}</div>)}</div>})}</div></Panel>
}

function RoadView({profile,longest,projection}:{profile:Profile;longest:number;projection:number|null}){
  const milestones=[5,7,10,12,15,16,18,21.1]; const next=milestones.find(m=>m>longest)??21.1; const progress=Math.min(100,longest/HM_DISTANCE*100);
  return <div className="grid two"><section className="hero-21"><div className="metric-label">Camino a 21,1 km</div><div className="big">{longest.toFixed(1)} km</div><p>Tu mayor distancia hasta ahora. Próximo objetivo: <b>{next} km</b> · faltan <b>{Math.max(0,next-longest).toFixed(1)} km</b>.</p><div className="progress-track" style={{margin:'20px 0'}}><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="grid" style={{gap:10}}>{milestones.map(m=><div className="kpi-line" key={m}><strong>{longest>=m?'✓':'○'} {m} km</strong><span>{longest>=m?'Completado':m===next?'Próximo hito':'Pendiente'}</span></div>)}</div></section><div className="grid" style={{gap:16}}><Panel title="Carrera objetivo" subtitle={profile.race_date}><div className="kpi-line"><strong>Distancia</strong><span>{profile.race_distance.toFixed(1)} km</span></div><div className="kpi-line"><strong>Tiempo deseado</strong><span>{profile.goal_time_seconds?formatDuration(profile.goal_time_seconds):'Sin definir'}</span></div><div className="kpi-line"><strong>Ritmo necesario</strong><span>{profile.goal_time_seconds?formatPace(profile.goal_time_seconds/profile.race_distance):'—'}</span></div><div className="kpi-line"><strong>Fondo objetivo previo</strong><span>{profile.goal_long_run.toFixed(1)} km</span></div></Panel><Panel title="Proyección 21,1 km" subtitle="Estimación, no garantía"><div className="metric-value">{projection?formatDuration(projection):'Sin datos'}</div><div className="metric-help">El resultado real depende de entrenamiento, fatiga, terreno, clima y otros factores.</div></Panel></div></div>
}

function ProfileView({data,setData,exportJson,exportCsv,reset}:any){
  const [p,setP]=useState<Profile>(data.profile);
  useEffect(()=>setP(data.profile),[data.profile]);
  function save(){setData({...data,profile:p})}
  const heatDays=Array.from({length:98},(_,i)=>addDays(new Date(),-(97-i))); const daily=new Map<string,number>(); data.workouts.filter((w:Workout)=>w.sport==='run').forEach((w:Workout)=>daily.set(w.date,(daily.get(w.date)||0)+w.distance_km));
  return <div className="grid two"><Panel title="Objetivos y perfil" subtitle="Ajusta el destino; las métricas se recalculan automáticamente"><div className="form-grid"><Field label="Nombre"><input value={p.name} onChange={e=>setP({...p,name:e.target.value})}/></Field><Field label="Fecha de media maratón"><input type="date" value={p.race_date} onChange={e=>setP({...p,race_date:e.target.value})}/></Field><Field label="Distancia objetivo (km)"><input type="number" step="0.1" value={p.race_distance} onChange={e=>setP({...p,race_distance:+e.target.value})}/></Field><Field label="Objetivo semanal (km)"><input type="number" step="0.1" value={p.goal_weekly_distance} onChange={e=>setP({...p,goal_weekly_distance:+e.target.value})}/></Field><Field label="Fondo objetivo previo (km)"><input type="number" step="0.1" value={p.goal_long_run} onChange={e=>setP({...p,goal_long_run:+e.target.value})}/></Field><Field label="Tiempo objetivo (segundos)"><input type="number" value={p.goal_time_seconds??''} onChange={e=>setP({...p,goal_time_seconds:e.target.value?+e.target.value:null})}/></Field></div><div className="modal-actions"><button className="btn primary" onClick={save}>Guardar objetivos</button></div></Panel><div className="grid" style={{gap:16}}><Panel title="Consistencia" subtitle="Últimos 98 días"><div className="heatmap">{heatDays.map(d=>{const km=daily.get(isoDate(d))||0;const cls=km===0?'':km<5?'l1':km<8?'l2':km<12?'l3':'l4';return <div key={isoDate(d)} title={`${isoDate(d)} · ${km.toFixed(1)} km`} className={`heat ${cls}`}/>})}</div></Panel><Panel title="Tus datos" subtitle="Privados por defecto"><div className="actions"><button className="btn" onClick={exportCsv}><Download size={16}/> CSV</button><button className="btn" onClick={exportJson}><Download size={16}/> JSON</button><button className="btn danger" onClick={reset}>Restaurar demo</button></div></Panel></div></div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}

function WorkoutModal({initial,onClose,onSave}:{initial:Workout|null;onClose:()=>void;onSave:(w:Workout)=>void}){
  const [advanced,setAdvanced]=useState(false);
  const [date,setDate]=useState(initial?.date??todayIso());
  const [type,setType]=useState<WorkoutType>(initial?.workout_type??'easy');
  const [distance,setDistance]=useState(String(initial?.distance_km??8));
  const [duration,setDuration]=useState(initial?formatDuration(initial.duration_seconds):'48:00');
  const [rpe,setRpe]=useState(String(initial?.rpe??''));
  const [avgHr,setAvgHr]=useState(String(initial?.average_hr??'')); const [maxHr,setMaxHr]=useState(String(initial?.max_hr??''));
  const [incline,setIncline]=useState(String(initial?.treadmill_incline??'')); const [elevation,setElevation]=useState(String(initial?.elevation_gain??''));
  const [surface,setSurface]=useState<Surface>(initial?.surface??'treadmill'); const [cadence,setCadence]=useState(String(initial?.cadence??''));
  const [calories,setCalories]=useState(String(initial?.calories??'')); const [notes,setNotes]=useState(initial?.notes??''); const [pain,setPain]=useState(initial?.pain??'');
  const [feeling,setFeeling]=useState<Feeling>(initial?.feeling??'normal'); const [sleep,setSleep]=useState(String(initial?.sleep_quality??''));
  const [exercises,setExercises]=useState(initial?.strength_exercises??[{id:crypto.randomUUID(),exercise_name:'Sentadilla',sets:3,reps:8,weight:40,muscle_group:'legs' as const}]);
  const seconds=parseDuration(duration); const km=Number(distance); const pace=paceSeconds(km,seconds); const speed=speedKmh(km,seconds); const valid=km>0&&seconds>0&&(!rpe||(Number(rpe)>=1&&Number(rpe)<=10));
  function submit(){ if(!valid)return; onSave({id:initial?.id??crypto.randomUUID(),date,sport:type==='gym'?'strength':'run',workout_type:type,distance_km:type==='gym'?0:km,duration_seconds:seconds,rpe:rpe?+rpe:null,average_hr:avgHr?+avgHr:null,max_hr:maxHr?+maxHr:null,treadmill_incline:incline?+incline:null,elevation_gain:elevation?+elevation:null,surface:type==='gym'?null:surface,cadence:cadence?+cadence:null,calories:calories?+calories:null,notes,pain,feeling,sleep_quality:sleep?+sleep:null,strength_exercises:type==='gym'?exercises:null,created_at:initial?.created_at??new Date().toISOString(),updated_at:new Date().toISOString()}); }
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="panel-head"><div><h2>{initial?'Editar entrenamiento':'Registrar entrenamiento'}</h2><div className="panel-sub">Los cuatro campos principales se completan en menos de 30 segundos.</div></div><button className="btn" onClick={onClose}><X size={16}/></button></div><div className="form-grid"><Field label="Fecha"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Tipo de entrenamiento"><select value={type} onChange={e=>setType(e.target.value as WorkoutType)}>{Object.entries(typeLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>{type!=='gym'&&<Field label="Distancia (km)"><input type="number" min="0.1" step="0.1" value={distance} onChange={e=>setDistance(e.target.value)}/></Field>}<Field label="Duración (mm:ss o h:mm:ss)"><input value={duration} onChange={e=>setDuration(e.target.value)} placeholder="48:00"/></Field>{type!=='gym'&&<div className="span2 preview"><span><Gauge size={15} style={{display:'inline',verticalAlign:'-2px'}}/> {formatPace(pace)}</span><span>{speed?`${speed.toFixed(1)} km/h`:'—'}</span></div>}</div>{type==='gym'&&<div style={{marginTop:14}}><div className="panel-head"><div><h3 style={{margin:0}}>Ejercicios</h3><div className="panel-sub">Series, repeticiones, peso y grupo muscular.</div></div><button className="btn" onClick={()=>setExercises([...exercises,{id:crypto.randomUUID(),exercise_name:'',sets:3,reps:8,weight:null,muscle_group:'legs' as const}])}><Plus size={15}/> Añadir</button></div><div className="grid" style={{gap:8}}>{exercises.map((ex:any,i:number)=><div key={ex.id} className="form-grid exercise-row"><Field label="Ejercicio"><input value={ex.exercise_name} onChange={e=>setExercises(exercises.map((x:any,j:number)=>j===i?{...x,exercise_name:e.target.value}:x))}/></Field><Field label="Series"><input type="number" min="1" value={ex.sets} onChange={e=>setExercises(exercises.map((x:any,j:number)=>j===i?{...x,sets:+e.target.value}:x))}/></Field><Field label="Reps"><input type="number" min="1" value={ex.reps} onChange={e=>setExercises(exercises.map((x:any,j:number)=>j===i?{...x,reps:+e.target.value}:x))}/></Field><Field label="Peso kg"><input type="number" step="0.5" value={ex.weight??''} onChange={e=>setExercises(exercises.map((x:any,j:number)=>j===i?{...x,weight:e.target.value?+e.target.value:null}:x))}/></Field><Field label="Grupo"><select value={ex.muscle_group} onChange={e=>setExercises(exercises.map((x:any,j:number)=>j===i?{...x,muscle_group:e.target.value}:x))}><option value="legs">Piernas</option><option value="core">Core</option><option value="upper">Tren superior</option><option value="full">Cuerpo completo</option><option value="mobility">Movilidad</option></select></Field><button className="btn danger" onClick={()=>setExercises(exercises.filter((_:any,j:number)=>j!==i))}><Trash2 size={15}/></button></div>)}</div></div>}<button className="btn" style={{marginTop:14}} onClick={()=>setAdvanced(!advanced)}>{advanced?'− Menos datos':'+ Más datos'}</button>{advanced&&<div className="more form-grid"><Field label="RPE 1–10"><input type="number" min="1" max="10" value={rpe} onChange={e=>setRpe(e.target.value)}/></Field><Field label="Sensación general"><select value={feeling} onChange={e=>setFeeling(e.target.value as Feeling)}>{Object.entries(feelingLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>{type!=='gym'&&<><Field label="Superficie"><select value={surface} onChange={e=>setSurface(e.target.value as Surface)}>{Object.entries(surfaceLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="Inclinación cinta (%)"><input type="number" step="0.1" value={incline} onChange={e=>setIncline(e.target.value)}/></Field><Field label="FC media"><input type="number" min="0" value={avgHr} onChange={e=>setAvgHr(e.target.value)}/></Field><Field label="FC máxima"><input type="number" min="0" value={maxHr} onChange={e=>setMaxHr(e.target.value)}/></Field><Field label="Desnivel (m)"><input type="number" min="0" value={elevation} onChange={e=>setElevation(e.target.value)}/></Field><Field label="Cadencia"><input type="number" min="0" value={cadence} onChange={e=>setCadence(e.target.value)}/></Field></>}<Field label="Calorías"><input type="number" min="0" value={calories} onChange={e=>setCalories(e.target.value)}/></Field><Field label="Calidad de sueño 1–5"><input type="number" min="1" max="5" value={sleep} onChange={e=>setSleep(e.target.value)}/></Field><Field label="Dolor o molestias"><input value={pain} onChange={e=>setPain(e.target.value)}/></Field><div className="span2"><Field label="Notas"><textarea value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div></div>}<div className="modal-actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!valid} onClick={submit}>{initial?'Guardar cambios':'Registrar'}</button></div></div></div>
}

function DetailModal({workout,runs,onClose,onEdit,onDelete}:any){
  const pace=paceSeconds(workout.distance_km,workout.duration_seconds); const speed=speedKmh(workout.distance_km,workout.duration_seconds);
  const similar=runs.filter((w:Workout)=>w.id!==workout.id&&Math.abs(w.distance_km-workout.distance_km)<=0.6&&new Date(w.date)<new Date(workout.date)).sort((a:Workout,b:Workout)=>b.date.localeCompare(a.date))[0];
  const compare=similar?{time:similar.duration_seconds-workout.duration_seconds,pace:(paceSeconds(similar.distance_km,similar.duration_seconds)||0)-(pace||0),rpe:(similar.rpe??0)-(workout.rpe??0)}:null;
  return <div className="modal-backdrop"><div className="modal"><div className="panel-head"><div><h2>{typeLabels[workout.workout_type as WorkoutType]}</h2><div className="panel-sub">{new Intl.DateTimeFormat('es-CO',{dateStyle:'long'}).format(new Date(workout.date+'T12:00:00'))}</div></div><button className="btn" onClick={onClose}><X size={16}/></button></div><section className="grid metrics" style={{gridTemplateColumns:'repeat(2,1fr)'}}><Metric label="Distancia" value={`${workout.distance_km.toFixed(1)} km`} help={workout.surface?surfaceLabels[workout.surface as Surface]:'—'}/><Metric label="Tiempo" value={formatDuration(workout.duration_seconds)} help={`${Math.round(workout.duration_seconds/60)} minutos`}/><Metric label="Ritmo" value={formatPace(pace)} help={speed?`${speed.toFixed(1)} km/h`:'—'}/><Metric label="Esfuerzo" value={workout.rpe?`${workout.rpe}/10`:'—'} help={workout.average_hr?`${workout.average_hr} bpm media`:'RPE opcional'}/></section>{compare&&<div style={{marginTop:18}}><h3>Comparación con entrenamiento similar</h3><div className="grid three"><div className="record"><span>Tiempo</span><b>{compare.time>0?`${formatDuration(compare.time)} más rápido`:`${formatDuration(Math.abs(compare.time))} más lento`}</b></div><div className="record"><span>Ritmo</span><b>{compare.pace>0?`${Math.round(compare.pace)} s/km mejor`:`${Math.round(Math.abs(compare.pace))} s/km más lento`}</b></div><div className="record"><span>RPE</span><b>{workout.rpe??'—'}</b><span>{similar.rpe?`Antes ${similar.rpe}/10`:'Sin comparación'}</span></div></div></div>}{workout.sport==='strength'&&workout.strength_exercises?.length>0&&<div style={{marginTop:18}}><h3>Ejercicios</h3><div className="grid" style={{gap:8}}>{workout.strength_exercises.map((ex:any)=><div className="kpi-line" key={ex.id}><strong>{ex.exercise_name}</strong><span>{ex.sets} × {ex.reps}{ex.weight?` · ${ex.weight} kg`:''}</span></div>)}</div></div>}{workout.notes&&<div style={{marginTop:18}}><h3>Notas</h3><p style={{color:'var(--muted)',lineHeight:1.55}}>{workout.notes}</p></div>}<div className="modal-actions"><button className="btn danger" onClick={onDelete}><Trash2 size={16}/> Eliminar</button><button className="btn" onClick={onEdit}>Editar</button><button className="btn primary" onClick={onClose}>Cerrar</button></div></div></div>
}
