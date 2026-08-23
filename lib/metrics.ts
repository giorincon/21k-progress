import type { Workout } from './types';

export const HM_DISTANCE = 21.0975;

export function paceSeconds(distanceKm: number, durationSeconds: number) {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) return null;
  return durationSeconds / distanceKm;
}

export function formatPace(secondsPerKm: number | null | undefined) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  const total = Math.round(secondsPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function speedKmh(distanceKm: number, durationSeconds: number) {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return distanceKm / (durationSeconds / 3600);
}

export function formatDuration(totalSeconds: number) {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseDuration(value: string) {
  const parts = value.trim().split(':').map(Number);
  if (!parts.length || parts.some(v => !Number.isFinite(v) || v < 0)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 60;
}

export function mondayOf(dateInput: string | Date) {
  const date = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? new Date(`${dateInput}T12:00:00`) : new Date(dateInput);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  return d;
}

export function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function weeklyMileage(workouts: Workout[]) {
  const map = new Map<string, number>();
  workouts.filter(w => w.sport === 'run').forEach(w => {
    const key = isoDate(mondayOf(w.date));
    map.set(key, (map.get(key) || 0) + Math.max(0, w.distance_km || 0));
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, km]) => ({ week, km: +km.toFixed(1) }));
}

export function weeklyLongRuns(workouts: Workout[]) {
  const map = new Map<string, number>();
  workouts.filter(w => w.sport === 'run').forEach(w => {
    const key = isoDate(mondayOf(w.date));
    map.set(key, Math.max(map.get(key) || 0, w.distance_km || 0));
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, km]) => ({ week, km: +km.toFixed(1) }));
}

export function sessionLoad(w: Workout) {
  if (!w.rpe || !w.duration_seconds) return 0;
  return Math.round((w.duration_seconds / 60) * w.rpe);
}

export function riegelPrediction(distance: number, seconds: number, target = HM_DISTANCE) {
  if (!distance || !seconds || distance <= 0 || seconds <= 0) return null;
  return seconds * Math.pow(target / distance, 1.06);
}

export function bestProjectionSource(workouts: Workout[]) {
  const candidates = workouts
    .filter(w => w.sport === 'run' && w.duration_seconds > 0 && w.distance_km >= 4.5)
    .map(w => {
      const reference = [5, 10, 15].sort((a, b) => Math.abs(w.distance_km - a) - Math.abs(w.distance_km - b))[0];
      const tolerance = reference === 5 ? 1 : reference === 10 ? 1.5 : 2;
      return { w, reference, diff: Math.abs(w.distance_km - reference), tolerance };
    })
    .filter(x => x.diff <= x.tolerance)
    .sort((a, b) => new Date(b.w.date).getTime() - new Date(a.w.date).getTime());
  return candidates[0]?.w || null;
}

export function dateRangeMileage(workouts: Workout[], days: number, end = new Date()) {
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return workouts.filter(w => { const d = new Date(`${w.date}T12:00:00`); return w.sport === 'run' && d >= start && d <= end; })
    .reduce((sum, w) => sum + w.distance_km, 0);
}

export function rollingDailyMileage(workouts: Workout[], daysBack = 100) {
  const today = new Date();
  const daily = new Map<string, number>();
  workouts.filter(w => w.sport === 'run').forEach(w => daily.set(w.date, (daily.get(w.date) || 0) + w.distance_km));
  const rows: {date: string; daily: number; ma7: number; ma28: number; ma42: number}[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const day = isoDate(d);
    const avg = (window: number) => {
      let sum = 0;
      for (let j = 0; j < window; j++) sum += daily.get(isoDate(addDays(d, -j))) || 0;
      return +(sum / window).toFixed(2);
    };
    rows.push({ date: day, daily: +(daily.get(day) || 0).toFixed(2), ma7: avg(7), ma28: avg(28), ma42: avg(42) });
  }
  return rows;
}

export function personalRecords(workouts: Workout[]) {
  const runs = workouts.filter(w => w.sport === 'run' && w.distance_km > 0 && w.duration_seconds > 0);
  const longest = runs.reduce((a, b) => !a || b.distance_km > a.distance_km ? b : a, null as Workout | null);
  const fastest = runs.reduce((a, b) => {
    const pa = a ? paceSeconds(a.distance_km, a.duration_seconds)! : Infinity;
    const pb = paceSeconds(b.distance_km, b.duration_seconds)!;
    return pb < pa ? b : a;
  }, null as Workout | null);
  const distances = [1, 3, 5, 10, 15, HM_DISTANCE];
  const curve = distances.map(d => {
    const eligible = runs.filter(w => w.distance_km >= d * 0.95);
    let best: {seconds: number; source: Workout} | null = null;
    eligible.forEach(w => {
      const p = paceSeconds(w.distance_km, w.duration_seconds);
      if (!p) return;
      const estimate = p * d;
      if (!best || estimate < best.seconds) best = { seconds: estimate, source: w };
    });
    return { distance: d, seconds: best?.seconds ?? null };
  });
  const weekly = weeklyMileage(runs);
  const bestWeek = weekly.reduce((a, b) => !a || b.km > a.km ? b : a, null as {week: string; km: number} | null);
  return { longest, fastest, curve, bestWeek };
}

export function generateInsights(workouts: Workout[]) {
  const insights: string[] = [];
  const weekly = weeklyMileage(workouts);
  if (weekly.length >= 2) {
    const current = weekly[weekly.length - 1];
    const prev = weekly[weekly.length - 2];
    if (prev.km > 0) {
      const delta = ((current.km - prev.km) / prev.km) * 100;
      insights.push(`Tu kilometraje cambió ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% respecto a la semana anterior.`);
    }
  }
  const longRuns = weeklyLongRuns(workouts);
  const maxLong = Math.max(0, ...longRuns.map(x => x.km));
  if (maxLong > 0) insights.push(`Tu fondo más largo registrado es de ${maxLong.toFixed(1)} km.`);
  const last30 = workouts.filter(w => new Date(w.date) >= addDays(new Date(), -30));
  const runCount = last30.filter(w => w.sport === 'run').length;
  const gymCount = last30.filter(w => w.sport === 'strength' || w.workout_type === 'gym').length;
  insights.push(`En los últimos 30 días registraste ${runCount} sesiones de carrera${gymCount ? ` y ${gymCount} de fuerza` : ''}.`);
  const easy = workouts.filter(w => w.workout_type === 'easy' && w.distance_km > 0 && w.duration_seconds > 0).sort((a,b)=>a.date.localeCompare(b.date));
  if (easy.length >= 4) {
    const first = easy.slice(0, Math.min(3, easy.length));
    const last = easy.slice(-Math.min(3, easy.length));
    const avg = (arr: Workout[]) => arr.reduce((s,w)=>s+(paceSeconds(w.distance_km,w.duration_seconds)||0),0)/arr.length;
    insights.push(`Tu ritmo medio en carreras fáciles pasó de ${formatPace(avg(first))} a ${formatPace(avg(last))}.`);
  }
  return insights.slice(0, 5);
}
