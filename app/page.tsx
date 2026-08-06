// app/page.tsx
'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { WorkoutProvider, useWorkout } from '@/contexts/WorkoutContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import Timer from '@/app/components/Timer';
import History from '@/app/components/History';
import Settings from '@/app/components/Settings';
import AuthScreen from '@/app/components/AuthScreen';

const supabase = getSupabaseClient();

// Match database values
const VALID_INTENSITIES = ['pressure', 'counter'];

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<'workout' | 'history' | 'settings'>('workout');
  const { currentWorkoutId, setCurrentWorkoutId } = useWorkout();
  const { settings } = useSettings();

  const handleWorkoutStart = async () => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Map intensity to valid database values
      let intensityValue = settings.intensityId || 'counter';
      
      // Ensure it's a valid value for your database
      if (!VALID_INTENSITIES.includes(intensityValue)) {
        console.warn(`Invalid intensity: ${intensityValue}, using fallback 'counter'`);
        intensityValue = 'counter';
      }
      
      console.log('[Page] Starting workout with intensity:', intensityValue);
      
      const result = await (supabase
        .from('workouts') as any)
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          intensity: intensityValue,
        })
        .select()
        .single();

      if (result.error) throw result.error;
      if (result.data) {
        console.log('[Page] Workout created with ID:', result.data.id);
        setCurrentWorkoutId(result.data.id);
        return result.data.id;
      }
      throw new Error('No data returned');
    } catch (error: any) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout. Please try again.');
      throw error;
    }
  };

  const handleWorkoutEnd = async () => {
    if (currentWorkoutId) {
      try {
        const result = await (supabase
          .from('workouts') as any)
          .update({ ended_at: new Date().toISOString() })
          .eq('id', currentWorkoutId);
        
        if (result.error) throw result.error;
        setCurrentWorkoutId(null);
      } catch (error) {
        console.error('Failed to end workout:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="p-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold">🥊 Boxing Timer</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setView('workout')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              view === 'workout' 
                ? 'bg-yellow-500 text-gray-900' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Workout
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              view === 'history' 
                ? 'bg-yellow-500 text-gray-900' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setView(view === 'settings' ? 'workout' : 'settings')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              view === 'settings' 
                ? 'bg-yellow-500 text-gray-900' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={signOut}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-full text-sm font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {view === 'workout' && (
        <Timer 
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