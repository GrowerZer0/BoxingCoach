// lib/auth.ts
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

// Use the singleton client
const supabase = getSupabaseClient();

// Hook for auth state - MAKE SURE THIS IS EXPORTED
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async (): Promise<User | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    supabase,
  };
}

// Standalone function to get current user - EXPORT THIS
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper: Get user from server component
export async function getServerUser() {
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const cookieStore = await cookies();
    
    const supabaseServer = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // For server components, we don't need to set cookies
          },
          remove(name: string, options: any) {
            // For server components, we don't need to remove cookies
          },
        },
      }
    );
    
    const { data: { user } } = await supabaseServer.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

// Export supabase for backward compatibility
export { supabase };

// DEFAULT EXPORT - Add this to ensure something is exported
export default { useAuth, getCurrentUser, getServerUser, supabase };