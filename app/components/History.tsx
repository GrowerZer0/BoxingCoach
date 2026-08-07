import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { IntensityLevel } from '@/types/workout';

interface Workout {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_rounds: number;
  total_duration: number;
  intensity: IntensityLevel | string;
}

const INTENSITY_BADGES: Record<string, { label: string; style: string }> = {
  flow: { label: '🧘 Flow', style: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  standard: { label: '🥊 Standard', style: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  intense: { label: '⚡ Intense', style: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  counter: { label: '🎯 Counter', style: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  // Fallback for legacy database records
  pressure: { label: '⚡ Pressure', style: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

export default function History() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteWorkout = async (id: string) => {
    if (!confirm('Delete this workout permanently?')) return;
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting workout:', error);
    } else {
      setWorkouts(prev => prev.filter(w => w.id !== id));
    }
  };

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
        {workouts.map((w) => {
          const badge = INTENSITY_BADGES[w.intensity] || INTENSITY_BADGES.standard;

          return (
            <div key={w.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  {new Date(w.started_at).toLocaleDateString()} at{' '}
                  {new Date(w.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-gray-400">
                  {w.total_rounds} rounds · {Math.floor(w.total_duration / 60)}m {w.total_duration % 60}s
                </div>
                <div className="text-sm mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs text-gray-500">
                  {w.ended_at ? '✅ Completed' : '⏳ In progress'}
                </div>
                <button
                  onClick={() => deleteWorkout(w.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}