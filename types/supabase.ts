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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at: string;
          ended_at?: string | null;
          intensity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          intensity?: string;
          created_at?: string;
        };
      };
    };
  };
}