import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export type Workout = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_rounds: number;
  total_duration: number;
  intensity: 'pressure' | 'counter';
  notes: string | null;
  created_at: string;
};

export type WorkoutRound = {
  id: string;
  workout_id: string;
  round_number: number;
  round_type: 'round' | 'rest';
  duration: number;
  callout_count: number;
  created_at: string;
};

export type CalloutLog = {
  id: string;
  workout_id: string;
  round_id: string;
  callout_text: string;
  callout_type: 'offense' | 'defense' | 'mixed';
  timestamp: string;
};