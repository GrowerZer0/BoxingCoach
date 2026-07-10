import { supabase, Workout, WorkoutRound, CalloutLog } from './supabase';

export async function saveWorkout(workoutData: Partial<Workout>) {
  const { data, error } = await supabase
    .from('workouts')
    .insert([workoutData])
    .select()
    .single();
  return { data, error };
}

export async function saveRound(roundData: Partial<WorkoutRound>) {
  const { data, error } = await supabase
    .from('workout_rounds')
    .insert([roundData])
    .select()
    .single();
  return { data, error };
}

export async function saveCallout(calloutData: Partial<CalloutLog>) {
  const { data, error } = await supabase
    .from('callout_logs')
    .insert([calloutData])
    .select()
    .single();
  return { data, error };
}

export async function getWorkoutHistory(limit = 20) {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_rounds (*),
      callout_logs (*)
    `)
    .order('started_at', { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function getWorkoutStats() {
  const { data, error } = await supabase
    .from('workouts')
    .select('total_rounds, total_duration, intensity, started_at')
    .order('started_at', { ascending: false });
  return { data, error };
}

export async function incrementCalloutCount(roundId: string) {
  const { data, error } = await supabase
    .from('workout_rounds')
    .select('callout_count')
    .eq('id', roundId)
    .single();
  if (error) return;
  const current = data?.callout_count || 0;
  await supabase
    .from('workout_rounds')
    .update({ callout_count: current + 1 })
    .eq('id', roundId);
}