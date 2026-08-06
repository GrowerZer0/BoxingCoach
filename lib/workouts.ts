// lib/workouts.ts - Simplified with 'as any' casting
import { getSupabaseClient } from './supabase';

const supabase = getSupabaseClient();

// Create a workout
export async function createWorkout(userId: string, intensity: string) {
  const { data, error } = await (supabase
    .from('workouts') as any)
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      intensity: intensity,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// End a workout
export async function endWorkout(workoutId: string) {
  const { data, error } = await (supabase
    .from('workouts') as any)
    .update({
      ended_at: new Date().toISOString()
    })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get user's workout history
export async function getWorkoutHistory(userId: string) {
  const { data, error } = await (supabase
    .from('workouts') as any)
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get a specific workout with its rounds and callouts
export async function getWorkoutDetails(workoutId: string) {
  const { data, error } = await (supabase
    .from('workouts') as any)
    .select(`
      *,
      workout_rounds:workout_rounds(
        *,
        callout_logs:callout_logs(*)
      )
    `)
    .eq('id', workoutId)
    .single();

  if (error) throw error;
  return data;
}

// Create a workout round
export async function createWorkoutRound(workoutId: string, roundNumber: number, duration: number) {
  const { data, error } = await (supabase
    .from('workout_rounds') as any)
    .insert({
      workout_id: workoutId,
      round_number: roundNumber,
      duration: duration,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Log a callout
export async function logCallout(roundId: string, callout: string, isDefensive: boolean) {
  const { data, error } = await (supabase
    .from('callout_logs') as any)
    .insert({
      round_id: roundId,
      callout: callout,
      is_defensive: isDefensive,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get workout statistics
export async function getWorkoutStats(userId: string) {
  const { data, error } = await (supabase
    .from('workouts') as any)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const totalWorkouts = data?.length || 0;
  const totalRounds = data?.reduce((acc: number, w: any) => acc + (w.total_rounds || 0), 0) || 0;
  const totalTime = data?.reduce((acc: number, w: any) => {
    if (w.started_at && w.ended_at) {
      const start = new Date(w.started_at).getTime();
      const end = new Date(w.ended_at).getTime();
      return acc + (end - start) / 1000 / 60; // minutes
    }
    return acc;
  }, 0) || 0;

  return {
    totalWorkouts,
    totalRounds,
    totalTime: Math.round(totalTime),
  };
}

// Get today's workouts
export async function getTodaysWorkouts(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await (supabase
    .from('workouts') as any)
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Delete a workout
export async function deleteWorkout(workoutId: string) {
  const { error } = await (supabase
    .from('workouts') as any)
    .delete()
    .eq('id', workoutId);

  if (error) throw error;
  return true;
}

// Helper: Get the current round count for a workout
export async function getWorkoutRoundCount(workoutId: string) {
  const { count, error } = await (supabase
    .from('workout_rounds') as any)
    .select('*', { count: 'exact', head: true })
    .eq('workout_id', workoutId);

  if (error) throw error;
  return count || 0;
}

// Helper: Update workout total rounds
export async function updateWorkoutTotalRounds(workoutId: string, totalRounds: number) {
  const { error } = await (supabase
    .from('workouts') as any)
    .update({
      total_rounds: totalRounds
    })
    .eq('id', workoutId);

  if (error) throw error;
  return true;
}

// Export types for reference (without using the Database type)
export interface Workout {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  intensity: string;
  total_rounds: number | null;
  created_at: string;
}

export interface WorkoutRound {
  id: string;
  workout_id: string;
  round_number: number;
  duration: number;
  created_at: string;
}

export interface CalloutLog {
  id: string;
  round_id: string;
  callout: string;
  is_defensive: boolean;
  timestamp: string;
  created_at: string;
}