import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkout } from '../contexts/WorkoutContext';

interface Workout {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_rounds: number;
  total_duration: number;
  intensity: 'pressure' | 'counter';
}

export default function History() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, started_at, ended_at, total_rounds, total_duration, intensity')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching history:', error);
      } else {
        setWorkouts(data || []);
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-400">Loading history...</div>;
  }

  if (workouts.length === 0) {
    return <div className="p-4 text-gray-400">No workouts yet. Time to train! 🥊</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">📊 Workout History</h2>
      <div className="space-y-3">
        {workouts.map((w) => (
          <div key={w.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  {new Date(w.started_at).toLocaleDateString()} at{' '}
                  {new Date(w.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-gray-400">
                  {w.total_rounds} rounds · {Math.floor(w.total_duration / 60)}m {w.total_duration % 60}s
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${w.intensity === 'pressure' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {w.intensity === 'pressure' ? '⚡ Pressure' : '🛡 Counter'}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {w.ended_at ? '✅ Completed' : '⏳ In progress'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}