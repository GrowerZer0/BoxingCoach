import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { WorkoutProvider, useWorkout } from '../contexts/WorkoutContext';
import Timer from '../components/Timer';
import History from '../components/History';
import AuthScreen from '../components/AuthScreen';
import { User } from '@supabase/supabase-js';

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'workout' | 'history'>('workout');
  const { currentWorkoutId, setCurrentWorkoutId } = useWorkout();

  // Load user on mount & listen for auth changes
  useEffect(() => {
    getCurrentUser().then(setUser);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // If not authenticated, show AuthScreen
  if (!user) return <AuthScreen />;

  // Handle workout creation (called from Timer when user starts a session)
  const handleWorkoutStart = async (intensity: 'pressure' | 'counter') => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([{
        user_id: user.id,
        started_at: new Date().toISOString(),
        intensity,
      }])
      .select()
      .single();

    if (data) {
      setCurrentWorkoutId(data.id);
    } else {
      console.error('Failed to start workout:', error);
    }
  };

  const handleWorkoutEnd = async () => {
    if (currentWorkoutId) {
      await supabase
        .from('workouts')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', currentWorkoutId);
      setCurrentWorkoutId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold">🥊 Tactical Boxing</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setView('workout')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              view === 'workout' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Workout
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              view === 'history' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-full text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </header>

      {view === 'workout' ? (
        <Timer
          roundLength={180}
          restLength={45}
          intensity="pressure"
          onWorkoutStart={handleWorkoutStart}
          onWorkoutEnd={handleWorkoutEnd}
          currentWorkoutId={currentWorkoutId}
        />
      ) : (
        <History />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <WorkoutProvider>
      <Dashboard />
    </WorkoutProvider>
  );
}