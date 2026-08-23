-- 21K Progress · Supabase schema
-- Ejecutar una sola vez en SQL Editor.

create table if not exists public.runner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  race_date date not null,
  race_distance numeric(6,2) not null default 21.10 check (race_distance > 0),
  goal_time_seconds integer check (goal_time_seconds is null or goal_time_seconds > 0),
  goal_weekly_distance numeric(7,2) not null default 30 check (goal_weekly_distance >= 0),
  goal_long_run numeric(6,2) not null default 18 check (goal_long_run >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.runner_workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sport text not null check (sport in ('run','strength','rest')),
  workout_type text not null check (workout_type in ('easy','tempo','intervals','long','recovery','gym','test','race','other')),
  distance_km numeric(7,2) not null default 0 check (distance_km >= 0),
  duration_seconds integer not null check (duration_seconds > 0),
  average_hr integer check (average_hr is null or average_hr > 0),
  max_hr integer check (max_hr is null or max_hr > 0),
  rpe smallint check (rpe is null or rpe between 1 and 10),
  elevation_gain numeric(8,1) check (elevation_gain is null or elevation_gain >= 0),
  treadmill_incline numeric(5,2),
  surface text check (surface is null or surface in ('treadmill','road','track','trail')),
  calories integer check (calories is null or calories >= 0),
  cadence integer check (cadence is null or cadence >= 0),
  notes text,
  pain text,
  sleep_quality smallint check (sleep_quality is null or sleep_quality between 1 and 5),
  feeling text check (feeling is null or feeling in ('excellent','good','normal','heavy','very_hard')),
  strength_exercises jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runner_workouts_user_date_idx on public.runner_workouts(user_id, date desc);
create index if not exists runner_workouts_user_type_date_idx on public.runner_workouts(user_id, workout_type, date desc);

alter table public.runner_profiles enable row level security;
alter table public.runner_workouts enable row level security;

create policy "runner profile select own" on public.runner_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "runner profile insert own" on public.runner_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "runner profile update own" on public.runner_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "runner profile delete own" on public.runner_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "runner workouts select own" on public.runner_workouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "runner workouts insert own" on public.runner_workouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "runner workouts update own" on public.runner_workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "runner workouts delete own" on public.runner_workouts for delete to authenticated using ((select auth.uid()) = user_id);
