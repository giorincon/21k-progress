import type { AppData, StrengthWorkout, Workout, WorkoutType } from './types';
import { addDays, isoDate } from './metrics';

function id(prefix: string, i: number) { return `${prefix}-${i}-${Math.random().toString(36).slice(2,8)}`; }

const today = new Date();
const longRuns = [7,8,9,7,10,11,12,9,13,14];
const workouts: Workout[] = [];
const strength: StrengthWorkout[] = [];
let idx = 1;

for (let week = 9; week >= 0; week--) {
  const base = addDays(today, -week * 7);
  const longKm = longRuns[9-week];
  const easyKm1 = 5 + ((9-week) % 3) * 0.5;
  const easyKm2 = 6 + ((9-week) % 4) * 0.5;
  const longPace = 405 - (9-week) * 2 + ((9-week)%3)*4;
  const easyPace = 395 - (9-week) * 1.5 + ((9-week)%4)*3;
  const types: WorkoutType[] = ['easy','tempo','intervals'];
  workouts.push({ id:id('run',idx++), date:isoDate(addDays(base,-4)), sport:'run', workout_type:'easy', distance_km:easyKm1, duration_seconds:Math.round(easyKm1*easyPace), average_hr:142, max_hr:158, rpe:4, surface:'treadmill', treadmill_incline:1, feeling:'good', notes:'Carrera fácil controlada.' });
  workouts.push({ id:id('run',idx++), date:isoDate(addDays(base,-2)), sport:'run', workout_type:types[(9-week)%types.length], distance_km:easyKm2, duration_seconds:Math.round(easyKm2*(easyPace-15)), average_hr:151, max_hr:171, rpe:6, surface:'treadmill', treadmill_incline:1, feeling:(9-week)%4===0?'heavy':'normal', notes:'Trabajo de calidad moderado.' });
  workouts.push({ id:id('run',idx++), date:isoDate(base), sport:'run', workout_type:'long', distance_km:longKm, duration_seconds:Math.round(longKm*longPace), average_hr:148, max_hr:165, rpe:5+(longKm>=13?1:0), surface:(9-week)%3===0?'road':'treadmill', treadmill_incline:(9-week)%3===0?null:1, feeling:longKm>=13?'normal':'good', notes:'Fondo semanal.' });
  workouts.push({ id:id('gymrun',idx++), date:isoDate(addDays(base,-5)), sport:'strength', workout_type:'gym', distance_km:0, duration_seconds:45*60, rpe:5, notes:'Fuerza general.', feeling:'good', strength_exercises:[{id:id('exw',idx++),exercise_name:'Sentadilla',sets:3,reps:8,weight:40,muscle_group:'legs'},{id:id('exw',idx++),exercise_name:'Peso muerto rumano',sets:3,reps:8,weight:45,muscle_group:'legs'},{id:id('exw',idx++),exercise_name:'Plancha',sets:3,reps:45,weight:null,muscle_group:'core'}] });
  strength.push({ id:id('gym',idx++), date:isoDate(addDays(base,-5)), duration_minutes:45, rpe:5, notes:'Fuerza general.', exercises:[
    {id:id('ex',idx++),exercise_name:'Sentadilla',sets:3,reps:8,weight:40,muscle_group:'legs'},
    {id:id('ex',idx++),exercise_name:'Peso muerto rumano',sets:3,reps:8,weight:45,muscle_group:'legs'},
    {id:id('ex',idx++),exercise_name:'Plancha',sets:3,reps:45,weight:null,muscle_group:'core'}
  ]});
}

export const demoData: AppData = {
  profile: {
    name: 'Gio',
    race_date: isoDate(addDays(today, 85)),
    race_distance: 21.1,
    goal_time_seconds: 2*3600,
    goal_weekly_distance: 30,
    goal_long_run: 18
  },
  workouts,
  strength
};
