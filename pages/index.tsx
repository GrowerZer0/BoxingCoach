import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import Timer from '../components/Timer';
import History from '../components/History';
import WorkoutContext from '../contexts/WorkoutContext';

export default function Home() {
  const [user, setUser] = useState(null);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [view, setView] = useState<'workout' | 'history'>('workout');

  useEffect(() => {
    getCurrentUser().then(setUser);
    
    // Auth listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // Create workout session
  const startWorkout = async (intensity: string) => {
    const { data } = await supabase
      .from('workouts')
      .insert([{
        user_id: user?.id,
        started_at: new Date().toISOString(),
        intensity,
      }])
      .select()
      .single();
    
    if (data) {
      setCurrentWorkoutId(data.id);
    }
  };

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <WorkoutContext.Provider value={{ currentWorkoutId, setCurrentWorkoutId }}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header with user profile */}
        <header className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">🥊 Tactical Boxing</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setView('workout')}
              className={`px-4 py-2 rounded ${view === 'workout' ? 'bg-yellow-500' : 'bg-gray-700'}`}
            >
              Workout
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded ${view === 'history' ? 'bg-yellow-500' : 'bg-gray-700'}`}
            >
              History
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-red-600 rounded"
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
            onCallout={(text, type) => console.log(text, type)}
          />
        ) : (
          <History />
        )}
      </div>
    </WorkoutContext.Provider>
  );
}