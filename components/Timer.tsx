import { useState, useEffect, useRef } from 'react';
import { saveRound, saveCallout } from '../lib/workouts';
import { useWorkoutContext } from '../contexts/WorkoutContext';

interface TimerProps {
  roundLength: number;
  restLength: number;
  intensity: 'pressure' | 'counter';
  onCallout: (text: string, type: string) => void;
}

export default function Timer({ roundLength, restLength, intensity, onCallout }: TimerProps) {
  const [phase, setPhase] = useState<'idle' | 'round' | 'rest' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [remaining, setRemaining] = useState(roundLength);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { currentWorkoutId } = useWorkoutContext();

  // Save round data when phase changes
  useEffect(() => {
    if (phase === 'round' && currentWorkoutId) {
      saveRound({
        workout_id: currentWorkoutId,
        round_number: roundNumber,
        round_type: 'round',
        duration: roundLength,
        callout_count: 0,
      }).then(({ data }) => {
        if (data) setCurrentRoundId(data.id);
      });
    }
    if (phase === 'rest' && currentWorkoutId) {
      saveRound({
        workout_id: currentWorkoutId,
        round_number: roundNumber,
        round_type: 'rest',
        duration: restLength,
        callout_count: 0,
      });
    }
  }, [phase, roundNumber, currentWorkoutId]);

  // Save callout logs
  const logCallout = (text: string, type: string) => {
    if (currentWorkoutId && currentRoundId) {
      saveCallout({
        workout_id: currentWorkoutId,
        round_id: currentRoundId,
        callout_text: text,
        callout_type: type as any,
      });
    }
    onCallout(text, type);
  };

  // Timer logic (similar to original but with persistence hooks)
  // ... (rest of timer implementation with save hooks)

  return (
    <div className="timer-container">
      {/* UI elements */}
    </div>
  );
}