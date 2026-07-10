import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { saveRound, saveCallout, incrementCalloutCount } from '@/lib/workouts';

interface TimerProps {
  roundLength: number;
  restLength: number;
  intensity: 'pressure' | 'counter';
  onWorkoutStart: (intensity: 'pressure' | 'counter') => Promise<void>;
  onWorkoutEnd: () => Promise<void>;
  currentWorkoutId: string | null;
}

// Combo libraries
const OFFENSIVE_PRESSURE = ['1', '2', '1-2', '3-4', '1-2-3', '2-3-2', '1-2-3-4', '1-2-3-2', '3-2-1', '4-3-2', '1-2-3-4-1', '2-3-2-4', '1-2-4', '3-2-4'];
const OFFENSIVE_COUNTER = ['1-2', '3-4', '1-2-3', '2-3-2', '1-2-3-4', '3-2-1', '1-2-4', '2-3-4'];
const DEFENSIVE_CUES = ['Slip left', 'Slip right', 'Roll right', 'Roll left', 'Block high', 'Block low', 'Pivot left', 'Pivot right', 'Step back', 'Angle out', 'Shoulder roll'];

export default function Timer({
  roundLength,
  restLength,
  intensity,
  onWorkoutStart,
  onWorkoutEnd,
  currentWorkoutId,
}: TimerProps) {
  const [phase, setPhase] = useState<'idle' | 'round' | 'rest' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [remaining, setRemaining] = useState(roundLength);
  const [calloutText, setCalloutText] = useState('Awaiting command...');
  const [calloutType, setCalloutType] = useState<'offense' | 'defense' | 'mixed' | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: string; time: string }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cadenceRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeRef = useRef(roundLength);
  const isActiveRef = useRef(false);

  // --- Speech ---
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = intensity === 'pressure' ? 0.95 : 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira')));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [intensity]);

  // --- Generate callout ---
  const generateCallout = useCallback(() => {
    const isPressure = intensity === 'pressure';
    const offenseRatio = isPressure ? 0.85 : 0.50;
    const roll = Math.random();

    if (roll < offenseRatio) {
      const pool = isPressure ? OFFENSIVE_PRESSURE : OFFENSIVE_COUNTER;
      const combo = pool[Math.floor(Math.random() * pool.length)];
      let text = combo;
      let type: 'offense' | 'mixed' = 'offense';
      if (!isPressure && Math.random() < 0.25) {
        const def = DEFENSIVE_CUES[Math.floor(Math.random() * DEFENSIVE_CUES.length)];
        text = `${combo} → ${def}`;
        type = 'mixed';
      }
      return { text, type };
    } else {
      const def = DEFENSIVE_CUES[Math.floor(Math.random() * DEFENSIVE_CUES.length)];
      return { text: def, type: 'defense' as const };
    }
  }, [intensity]);

  // --- Schedule next cadence ---
  const scheduleCadence = useCallback(() => {
    if (!isActiveRef.current) return;
    if (cadenceRef.current) clearTimeout(cadenceRef.current);

    const minDelay = intensity === 'pressure' ? 1200 : 2800;
    const maxDelay = intensity === 'pressure' ? 2800 : 5500;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    cadenceRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;
      const callout = generateCallout();
      setCalloutText(callout.text);
      setCalloutType(callout.type);
      speak(callout.text);

      // Save to Supabase
      if (currentWorkoutId && currentRoundId) {
        saveCallout({
          workout_id: currentWorkoutId,
          round_id: currentRoundId,
          callout_text: callout.text,
          callout_type: callout.type,
        });
        // Increment callout count
        supabase
          .from('workout_rounds')
          .update({ callout_count: incrementCalloutCount(currentRoundId) })
          .eq('id', currentRoundId);
      }

      // Local log
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(prev => [{ text: callout.text, type: callout.type, time }, ...prev].slice(0, 50));

      scheduleCadence();
    }, delay);
  }, [intensity, generateCallout, speak, currentWorkoutId, currentRoundId]);

  // --- Timer tick ---
  const tick = useCallback(() => {
    setElapsed(prev => {
      const newElapsed = prev + 1;
      const newRemaining = Math.max(0, maxTimeRef.current - newElapsed);
      setRemaining(newRemaining);

      if (newElapsed >= maxTimeRef.current) {
        if (phase === 'round') {
          // Round complete → rest
          setPhase('rest');
          maxTimeRef.current = restLength;
          setElapsed(0);
          setRemaining(restLength);
          isActiveRef.current = false;
          if (cadenceRef.current) clearTimeout(cadenceRef.current);
          // Update total rounds
          supabase
            .from('workouts')
            .update({ total_rounds: roundNumber })
            .eq('id', currentWorkoutId);
          return 0;
        } else if (phase === 'rest') {
          // Rest complete → next round
          const nextRound = roundNumber + 1;
          setRoundNumber(nextRound);
          setPhase('round');
          maxTimeRef.current = roundLength;
          setElapsed(0);
          setRemaining(roundLength);
          isActiveRef.current = true;
          // Create new round in DB
          if (currentWorkoutId) {
            saveRound({
              workout_id: currentWorkoutId,
              round_number: nextRound,
              round_type: 'round',
              duration: roundLength,
              callout_count: 0,
            }).then(({ data }) => {
              if (data) setCurrentRoundId(data.id);
            });
          }
          scheduleCadence();
          return 0;
        }
      }
      return newElapsed;
    });
  }, [phase, roundLength, restLength, roundNumber, currentWorkoutId, scheduleCadence]);

  // --- Start / Pause / Reset ---
  const startTimer = useCallback(async () => {
    if (phase === 'idle') {
      // Start workout via parent callback
      await onWorkoutStart(intensity);
      // Now currentWorkoutId should be set by parent
      if (!currentWorkoutId) {
        console.error('Workout ID not set after start');
        return;
      }

      setRoundNumber(1);
      setPhase('round');
      maxTimeRef.current = roundLength;
      setElapsed(0);
      setRemaining(roundLength);
      isActiveRef.current = true;

      // Create first round
      const { data } = await saveRound({
        workout_id: currentWorkoutId,
        round_number: 1,
        round_type: 'round',
        duration: roundLength,
        callout_count: 0,
      });
      if (data) setCurrentRoundId(data.id);

      timerRef.current = setInterval(tick, 1000);
      scheduleCadence();
    } else if (phase === 'paused') {
      setPhase('round'); // or 'rest'? we'll just resume to same phase
      isActiveRef.current = true;
      timerRef.current = setInterval(tick, 1000);
    }
  }, [phase, roundLength, intensity, tick, scheduleCadence, currentWorkoutId, onWorkoutStart]);

  const pauseTimer = useCallback(() => {
    if (phase === 'round' || phase === 'rest') {
      setPhase('paused');
      isActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearTimeout(cadenceRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [phase]);

  const resetTimer = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (cadenceRef.current) clearTimeout(cadenceRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPhase('idle');
    setElapsed(0);
    setRoundNumber(0);
    setRemaining(roundLength);
    setCalloutText('Awaiting command...');
    setCalloutType(null);
    setCurrentRoundId(null);
    isActiveRef.current = false;
    setLogs([]);
    // End workout if active
    if (currentWorkoutId) {
      await onWorkoutEnd();
    }
  }, [roundLength, currentWorkoutId, onWorkoutEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearTimeout(cadenceRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // --- UI ---
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center mb-4">
        <div className={`text-7xl font-bold font-mono ${phase === 'round' ? 'text-red-400' : phase === 'rest' ? 'text-blue-400' : 'text-gray-300'}`}>
          {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
        </div>
        <div className="text-gray-400 mt-1">
          {phase === 'idle' && 'Ready'}
          {phase === 'round' && `⚔️ Round ${roundNumber}`}
          {phase === 'rest' && `🔄 Rest (Round ${roundNumber} complete)`}
          {phase === 'paused' && '⏸ Paused'}
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 mb-4 min-h-24 flex items-center justify-center border border-gray-700">
        <div className="text-2xl font-semibold text-center">
          {calloutText}
          {calloutType && (
            <span className={`ml-3 text-xs font-bold uppercase px-2 py-1 rounded-full ${calloutType === 'defense' ? 'bg-blue-500/20 text-blue-300' : calloutType === 'offense' ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'}`}>
              {calloutType}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={startTimer}
          disabled={phase === 'round' || phase === 'rest'}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-full disabled:opacity-50"
        >
          {phase === 'idle' ? '▶ Start' : phase === 'paused' ? '▶ Resume' : '▶ Start'}
        </button>
        <button
          onClick={pauseTimer}
          disabled={phase === 'idle' || phase === 'paused'}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-full disabled:opacity-50"
        >
          ⏸ Pause
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full"
        >
          ⟲ Reset
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Callout Log</h3>
          <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white">Clear</button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex justify-between text-sm p-1 bg-gray-700/30 rounded">
              <span className={`${log.type === 'defense' ? 'text-blue-300' : log.type === 'offense' ? 'text-red-300' : 'text-purple-300'}`}>
                {log.type === 'defense' ? '🛡' : log.type === 'offense' ? '🥊' : '⚡'} {log.text}
              </span>
              <span className="text-gray-500 text-xs">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}