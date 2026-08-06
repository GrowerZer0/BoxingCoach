// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          settings?: Json;
          updated_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          intensity: string;
          total_rounds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          intensity?: string;
          total_rounds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          intensity?: string;
          total_rounds?: number | null;
          created_at?: string;
        };
      };
      workout_rounds: {
        Row: {
          id: string;
          workout_id: string;
          round_number: number;
          duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          round_number: number;
          duration: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          round_number?: number;
          duration?: number;
          created_at?: string;
        };
      };
      callout_logs: {
        Row: {
          id: string;
          round_id: string;
          callout: string;
          is_defensive: boolean;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          callout: string;
          is_defensive?: boolean;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          callout?: string;
          is_defensive?: boolean;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
  };
}