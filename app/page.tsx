'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { WorkoutProvider, useWorkout } from '@/contexts/WorkoutContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import Timer from '@/app/components/Timer';
import History from '@/app/components/History';
import Settings from '@/app/components/Settings';
import AuthScreen from '@/app/components/AuthScreen';

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'workout' | 'history' | 'settings'>('workout');
  const { currentWorkoutId, setCurrentWorkoutId } = useWorkout();
  const {
    roundLength,
    restLength,
    intensity,
    minDelay,
    maxDelay,
    selectedVoiceName,
    genderFilter,
    callouts,
  } = useSettings();

  useEffect(() => {
    getCurrentUser().then(setUser);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  if (!user) return <AuthScreen />;

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

    if (error) {
      console.error('Failed to start workout:', error);
      throw error;
    }
    if (data) {
      setCurrentWorkoutId(data.id);
      return data.id;
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
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${view === 'workout' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'}`}
          >
            Workout
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${view === 'history' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'}`}
          >
            History
          </button>
          <button
            onClick={() => setView(view === 'settings' ? 'workout' : 'settings')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm font-semibold"
          >
            ⚙️
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-full text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </header>

      {view === 'workout' && (
        <Timer
          roundLength={roundLength}
          restLength={restLength}
          intensity={intensity}
          minDelay={minDelay}
          maxDelay={maxDelay}
          selectedVoiceName={selectedVoiceName}
          genderFilter={genderFilter}
          callouts={callouts}
          onWorkoutStart={handleWorkoutStart}
          onWorkoutEnd={handleWorkoutEnd}
          currentWorkoutId={currentWorkoutId}
        />
      )}
      {view === 'history' && <History />}
      {view === 'settings' && <Settings />}
    </div>
  );
}

export default function Home() {
  return (
    <SettingsProvider>
      <WorkoutProvider>
        <Dashboard />
      </WorkoutProvider>
    </SettingsProvider>
  );
}