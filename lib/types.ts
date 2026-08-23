export type WorkoutType = 'easy' | 'tempo' | 'intervals' | 'long' | 'recovery' | 'gym' | 'test' | 'race' | 'other';
export type Surface = 'treadmill' | 'road' | 'track' | 'trail';
export type Feeling = 'excellent' | 'good' | 'normal' | 'heavy' | 'very_hard';
export type Sport = 'run' | 'strength' | 'rest';

export type Workout = {
  id: string;
  user_id?: string;
  date: string;
  sport: Sport;
  workout_type: WorkoutType;
  distance_km: number;
  duration_seconds: number;
  average_hr?: number | null;
  max_hr?: number | null;
  rpe?: number | null;
  elevation_gain?: number | null;
  treadmill_incline?: number | null;
  surface?: Surface | null;
  calories?: number | null;
  cadence?: number | null;
  notes?: string | null;
  pain?: string | null;
  sleep_quality?: number | null;
  feeling?: Feeling | null;
  strength_exercises?: StrengthExercise[] | null;
  created_at?: string;
  updated_at?: string;
};

export type StrengthExercise = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight?: number | null;
  muscle_group: 'legs' | 'core' | 'upper' | 'full' | 'mobility';
};

export type StrengthWorkout = {
  id: string;
  user_id?: string;
  date: string;
  duration_minutes: number;
  rpe?: number | null;
  notes?: string | null;
  exercises: StrengthExercise[];
};

export type Profile = {
  name: string;
  race_date: string;
  race_distance: number;
  goal_time_seconds?: number | null;
  goal_weekly_distance: number;
  goal_long_run: number;
};

export type AppData = {
  profile: Profile;
  workouts: Workout[];
  strength: StrengthWorkout[];
};
