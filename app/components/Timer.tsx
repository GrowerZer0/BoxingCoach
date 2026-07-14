'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { saveRound, saveCallout, incrementCalloutCount } from '@/lib/workouts';
import { CalloutType } from '@/contexts/SettingsContext';
import { useWakeLock } from '@/hooks/useWakeLock';

interface TimerProps {
  roundLength: number;
  restLength: number;
  intensity: 'pressure' | 'counter';
  minDelay: number;
  maxDelay: number;
  selectedVoiceName: string;
  genderFilter: 'all' | 'male' | 'female';
  callouts: CalloutType[];
  onWorkoutStart: (intensity: 'pressure' | 'counter') => Promise<void>;
  onWorkoutEnd: () => Promise<void>;
  currentWorkoutId: string | null;
}

// Filter for natural voices – keep these, drop the rest
const isGoodVoice = (name: string): boolean => {
  const keepPatterns = [
    'Google', 'Samantha', 'Zira', 'David', 'Daniel', 'Mark', 'Paul',
    'George', 'Andrew', 'Susan', 'Kate', 'Emma', 'Julie', 'Alice',
    'Microsoft', 'Natural', 'Premium'
  ];
  const badPatterns = [
    'Albert', 'Bad News', 'Whisper', 'Trinoids', 'Robot', 'Rishi',
    'Tessa', 'Zarvox', 'Fred', 'Junior', 'Ava', 'Alva', 'Milena',
    'Veena', 'Xander', 'Lea', 'Nicky', 'Nora', 'Sofia', 'Sergio',
    'Raquel', 'Fiona', 'Serena', 'Ricardo', 'Moira', 'Rosa',
    'Enrique', 'Conchita', 'Diego', 'Isabela', 'Javier', 'Lucas',
    'Cellos', 'Trinoids', 'Whisper'
  ];
  // Keep if any keepPattern matches, but exclude bad ones
  const isKeep = keepPatterns.some(p => name.includes(p));
  const isBad = badPatterns.some(p => name.includes(p));
  return isKeep && !isBad;
};

// Combo pools (will be filtered by enabled callouts)
const OFFENSIVE_PRESSURE = ['1', '2', '3', '4', '1-2', '3-4', '1-2-3', '2-3-2', '1-2-3-4', '1-2-3-2', '3-2-1', '4-3-2', '1-2-3-4-1', '2-3-2-4', '1-2-4', '3-2-4'];
const OFFENSIVE_COUNTER = ['1-2', '3-4', '1-2-3', '2-3-2', '1-2-3-4', '3-2-1', '1-2-4', '2-3-4'];
const DEFENSIVE_CUES = ['Slip left', 'Slip right', 'Roll right', 'Roll left', 'Block high', 'Block low', 'Pivot left', 'Pivot right', 'Step back', 'Angle out', 'Shoulder roll'];

export default function Timer({
  roundLength,
  restLength,
  intensity,
  minDelay,
  maxDelay,
  selectedVoiceName,
  genderFilter,
  callouts,
  onWorkoutStart,
  onWorkoutEnd,
  currentWorkoutId,
}: TimerProps) {
  // --- Core state ---
  const [phase, setPhase] = useState<'idle' | 'round' | 'rest' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [remaining, setRemaining] = useState(roundLength);
  const [calloutText, setCalloutText] = useState('Awaiting command...');
  const [calloutType, setCalloutType] = useState<'offense' | 'defense' | 'mixed' | 'ground' | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: string; time: string }[]>([]);

  // Refs to avoid stale closures
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cadenceRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeRef = useRef(roundLength);
  const isActiveRef = useRef(false);
  const phaseRef = useRef(phase);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // --- Wake Lock ---
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  // --- Voice handling ---
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    let retries = 0;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0 && retries < 5) {
        retries++;
        setTimeout(loadVoices, 500);
        return;
      }
      let enVoices = allVoices.filter(v => v.lang.startsWith('en'));
      if (genderFilter === 'male') {
        enVoices = enVoices.filter(v => /male|david|daniel|mark|paul|george|andrew/i.test(v.name));
      } else if (genderFilter === 'female') {
        enVoices = enVoices.filter(v => /female|samantha|zira|susan|kate|emma|julie|alice/i.test(v.name));
      }
      // Filter out weird voices
      enVoices = enVoices.filter(v => isGoodVoice(v.name));
      setVoices(enVoices);
      const found = selectedVoiceName ? enVoices.find(v => v.name === selectedVoiceName) : null;
      const voice = found || enVoices[0] || null;
      setSelectedVoice(voice);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [genderFilter, selectedVoiceName]);

  // --- Speech initialization ---
  const initializeSpeech = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  }, []);

  // --- Speak ---
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = intensity === 'pressure' ? 0.95 : 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  }, [intensity, selectedVoice]);

  // --- Generate callout ---
  const generateCallout = useCallback(() => {
    const isPressure = intensity === 'pressure';
    const offenseRatio = isPressure ? 0.85 : 0.50;
    const roll = Math.random();

    const enabledOffense = callouts.filter(c => c.enabled && c.category === 'offense').map(c => c.id);
    const enabledDefense = callouts.filter(c => c.enabled && c.category === 'defense').map(c => c.id);
    const enabledGround = callouts.filter(c => c.enabled && c.category === 'ground').map(c => c.id);

    const offensePool = enabledOffense.length > 0 ? enabledOffense : ['1', '2'];
    const defensePool = enabledDefense.length > 0 ? enabledDefense : ['Slip left'];
    const groundPool = enabledGround.length > 0 ? enabledGround : ['Shrimp'];

    let text: string, type: 'offense' | 'defense' | 'mixed' | 'ground';
    if (roll < offenseRatio) {
      const combo = offensePool[Math.floor(Math.random() * offensePool.length)];
      text = combo;
      type = 'offense';
      if (!isPressure && Math.random() < 0.25 && defensePool.length > 0) {
        const def = defensePool[Math.floor(Math.random() * defensePool.length)];
        text = `${combo} → ${def}`;
        type = 'mixed';
      }
    } else {
      const isGround = Math.random() < 0.3 && groundPool.length > 0;
      const pool = isGround ? groundPool : defensePool;
      text = pool[Math.floor(Math.random() * pool.length)];
      type = isGround ? 'ground' : 'defense';
    }
    return { text, type };
  }, [intensity, callouts]);

  // --- Schedule cadence (recursive) ---
  const scheduleCadence = useCallback(() => {
    if (!isActiveRef.current) return;
    if (cadenceRef.current) clearTimeout(cadenceRef.current);

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    cadenceRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;
      const callout = generateCallout();
      setCalloutText(callout.text);
      setCalloutType(callout.type);
      speak(callout.text);

      // Save to DB if workout active
      if (currentWorkoutId && currentRoundId) {
        saveCallout({
          workout_id: currentWorkoutId,
          round_id: currentRoundId,
          callout_text: callout.text,
          callout_type: callout.type,
        });
        incrementCalloutCount(currentRoundId);
      }

      // Add to log
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(prev => [{ text: callout.text, type: callout.type, time }, ...prev].slice(0, 50));

      // Schedule next
      scheduleCadence();
    }, delay);
  }, [minDelay, maxDelay, generateCallout, speak, currentWorkoutId, currentRoundId]);

  // --- Timer tick (uses refs for phase) ---
  const tick = useCallback(() => {
    setElapsed(prev => {
      const newElapsed = prev + 1;
      const newRemaining = Math.max(0, maxTimeRef.current - newElapsed);
      setRemaining(newRemaining);

      if (newElapsed >= maxTimeRef.current) {
        const currentPhase = phaseRef.current;
        if (currentPhase === 'round') {
          // Round complete → rest
          setPhase('rest');
          maxTimeRef.current = restLength;
          setElapsed(0);
          setRemaining(restLength);
          isActiveRef.current = false;
          if (cadenceRef.current) clearTimeout(cadenceRef.current);
          supabase
            .from('workouts')
            .update({ total_rounds: roundNumber })
            .eq('id', currentWorkoutId);
          releaseWakeLock();
          return 0;
        } else if (currentPhase === 'rest') {
          // Rest complete → next round
          const nextRound = roundNumber + 1;
          setRoundNumber(nextRound);
          setPhase('round');
          maxTimeRef.current = roundLength;
          setElapsed(0);
          setRemaining(roundLength);
          isActiveRef.current = true;
          requestWakeLock();
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
  }, [roundLength, restLength, roundNumber, currentWorkoutId, scheduleCadence, requestWakeLock, releaseWakeLock]);

  // --- Start / Pause / Reset ---
  const startTimer = useCallback(async () => {
    initializeSpeech();

    if (phase === 'idle') {
      await onWorkoutStart(intensity);
      if (!currentWorkoutId) {
        console.error('Workout ID not set');
        return;
      }
      setRoundNumber(1);
      setPhase('round');
      maxTimeRef.current = roundLength;
      setElapsed(0);
      setRemaining(roundLength);
      isActiveRef.current = true;
      requestWakeLock();

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
      setPhase('round');
      isActiveRef.current = true;
      requestWakeLock();
      timerRef.current = setInterval(tick, 1000);
      scheduleCadence();
    }
  }, [phase, roundLength, intensity, tick, scheduleCadence, currentWorkoutId, onWorkoutStart, initializeSpeech, requestWakeLock]);

  const pauseTimer = useCallback(() => {
    if (phase === 'round' || phase === 'rest') {
      setPhase('paused');
      isActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearTimeout(cadenceRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      releaseWakeLock();
    }
  }, [phase, releaseWakeLock]);

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
    releaseWakeLock();
    if (currentWorkoutId) {
      await onWorkoutEnd();
    }
  }, [roundLength, currentWorkoutId, onWorkoutEnd, releaseWakeLock]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cadenceRef.current) clearTimeout(cadenceRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // --- UI ---
  const isStartDisabled = phase === 'round' || phase === 'rest';
  const isPauseDisabled = phase === 'idle' || phase === 'paused';

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Timer display */}
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

      {/* Callout box */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-4 min-h-24 flex items-center justify-center border border-gray-700">
        <div className="text-2xl font-semibold text-center">
          {calloutText}
          {calloutType && (
            <span className={`ml-3 text-xs font-bold uppercase px-2 py-1 rounded-full ${
              calloutType === 'defense' ? 'bg-blue-500/20 text-blue-300' :
              calloutType === 'offense' ? 'bg-red-500/20 text-red-300' :
              calloutType === 'ground' ? 'bg-green-500/20 text-green-300' :
              'bg-purple-500/20 text-purple-300'
            }`}>
              {calloutType}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={startTimer}
          disabled={isStartDisabled}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-full disabled:opacity-50"
        >
          {phase === 'idle' ? '▶ Start' : phase === 'paused' ? '▶ Resume' : '▶ Start'}
        </button>
        <button
          onClick={pauseTimer}
          disabled={isPauseDisabled}
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

      {/* Log */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Callout Log</h3>
          <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white">Clear</button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex justify-between text-sm p-1 bg-gray-700/30 rounded">
              <span className={`${
                log.type === 'defense' ? 'text-blue-300' :
                log.type === 'offense' ? 'text-red-300' :
                log.type === 'ground' ? 'text-green-300' :
                'text-purple-300'
              }`}>
                {log.type === 'defense' ? '🛡' : log.type === 'offense' ? '🥊' : log.type === 'ground' ? '🤼' : '⚡'} {log.text}
              </span>
              <span className="text-gray-500 text-xs">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}