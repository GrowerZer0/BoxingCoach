// hooks/useTimer.ts - Fixed event timing
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudio } from './useAudio';
import { useSettings } from '@/contexts/SettingsContext';
import { INTENSITY_PRESETS, getRandomDelay, isDefensiveMove } from '@/types/workout';

export type TimerPhase = 'idle' | 'countdown' | 'round' | 'rest' | 'finished';

export interface TimerConfig {
  roundDuration: number;
  restDuration: number;
  rounds: number;
  currentRound: number;
  phase: TimerPhase;
  countdown: number;
  countdownTotal: number;
  intensityId: string;
}

// Combo lists for each intensity level
const COMBOS = {
  simple: ['Jab', 'Cross', 'Jab-Cross', 'Jab-Jab', 'Cross-Hook', 'Left Hook', 'Right Hook'],
  moderate: ['Jab-Cross-Hook', 'Jab-Jab-Cross', 'Cross-Hook-Cross', 'Jab-Cross-Uppercut', 'Hook-Cross-Hook', 'Double Jab-Cross', 'Jab-Hook-Cross'],
  complex: ['Jab-Cross-Hook-Cross', 'Jab-Hook-Cross-Hook', 'Cross-Uppercut-Hook-Cross', 'Jab-Cross-Uppercut-Hook', 'Double Jab-Cross-Hook', 'Jab-Cross-Hook-Uppercut-Hook'],
};

export function useTimer(initialConfig: Partial<TimerConfig> = {}) {
  const { settings } = useSettings();
  const audio = useAudio();

  const [config, setConfig] = useState<TimerConfig>({
    roundDuration: 180,
    restDuration: 60,
    rounds: 3,
    currentRound: 1,
    phase: 'idle',
    countdown: 10,
    countdownTotal: 10,
    intensityId: settings?.intensityId || 'counter',
    ...initialConfig
  });

  const [timeRemaining, setTimeRemaining] = useState(config.roundDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCallout, setCurrentCallout] = useState<string>('');
  const [isDefensive, setIsDefensive] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<{ time: number; action: () => void; triggered: boolean }[]>([]);
  const calloutScheduledRef = useRef(false);
  const isRoundActiveRef = useRef(false);

  // Play countdown beep pattern
  const playCountdownBeep = useCallback((second: number) => {
    console.log(`[Timer] Countdown: ${second}`);
    
    if (second === 10) {
      audio.playBeep();
      audio.hapticFeedback(15);
      if (audio.speakText) {
        audio.speakText('Get ready');
      }
    } else if (second === 3) {
      audio.playBeep();
      audio.hapticFeedback(10);
    } else if (second === 2) {
      audio.playBeep();
      audio.hapticFeedback(10);
    } else if (second === 1) {
      audio.playBeep();
      audio.hapticFeedback(10);
    } else if (second === 0) {
      console.log('[Timer] BELL - Round starting!');
      audio.hapticFeedback([50, 100, 50]);
      audio.playBell();
    }
  }, [audio]);

  // Schedule next callout
  const scheduleNextCallout = useCallback(() => {
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }

    if (!isRunning || isPaused || config.phase !== 'round' || !isRoundActiveRef.current) {
      calloutScheduledRef.current = false;
      return;
    }

    if (timeRemaining <= 4) { // Stop callouts when 4 seconds left (before 3-2-1 beeps)
      calloutScheduledRef.current = false;
      return;
    }

    const currentRoundConfig = settings?.roundConfigs?.find(
      (rc: { roundNumber: number }) => rc.roundNumber === config.currentRound
    );
    
    let availableMoves: string[] = currentRoundConfig?.combos || [];
    
    if (availableMoves.length === 0) {
      const intensity = INTENSITY_PRESETS[config.intensityId] || INTENSITY_PRESETS.counter;
      availableMoves = COMBOS[intensity.comboComplexity] || COMBOS.moderate;
    }

    const intensity = INTENSITY_PRESETS[config.intensityId] || INTENSITY_PRESETS.counter;
    
    const baseDelay = getRandomDelay(intensity.minDelay, intensity.maxDelay);
    const jitter = Math.random() * 2 - 1;
    const delay = Math.max(1.5, baseDelay + jitter) * 1000;

    calloutScheduledRef.current = true;

    calloutTimerRef.current = setTimeout(() => {
      if (!isRunning || isPaused || config.phase !== 'round' || !isRoundActiveRef.current || timeRemaining <= 4) {
        calloutScheduledRef.current = false;
        return;
      }

      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      
      if (randomMove) {
        const isDefensiveCall = isDefensiveMove(randomMove);
        setIsDefensive(isDefensiveCall);
        setCurrentCallout(randomMove);
        
        if (audio.speakText) {
          audio.speakText(randomMove, 'high');
        }
        audio.hapticFeedback([15, 30, 15]);
      }
      
      calloutScheduledRef.current = false;
      scheduleNextCallout();
    }, delay);
  }, [isRunning, isPaused, config.phase, config.intensityId, config.currentRound, timeRemaining, audio, settings?.roundConfigs]);

  // Schedule events for a round - CORRECT timing
  const scheduleRoundEvents = useCallback((duration: number) => {
    const events: { time: number; action: () => void; triggered: boolean }[] = [];
    
    // HALFWAY - at 50% of duration (when timeRemaining = duration/2)
    const halfwayTime = Math.floor(duration / 2);
    events.push({
      time: halfwayTime,
      action: () => {
        console.log('[Timer] Halfway there!');
        audio.hapticFeedback([30, 50, 30]);
        if (audio.speakText) {
          audio.speakText('Halfway there');
        }
      },
      triggered: false
    });
    
    // 10 SECONDS LEFT - when timeRemaining = 10 (NOT duration - 10!)
    if (duration > 10) {
      events.push({
        time: 10,
        action: () => {
          console.log('[Timer] 10 seconds left!');
          audio.hapticFeedback([20, 50, 20]);
          if (audio.speakText) {
            audio.speakText('10 seconds left');
          }
        },
        triggered: false
      });
    }
    
    // 3-2-1 countdown at END of round (when timeRemaining = 3, 2, 1)
    for (let i = 3; i >= 1; i--) {
      const count = i;
      events.push({
        time: count,
        action: () => {
          console.log(`[Timer] ${count}...`);
          audio.hapticFeedback(10);
          audio.playBeep();
        },
        triggered: false
      });
    }
    
    // Final bell at the end of the round (when timeRemaining = 0)
    events.push({
      time: 0,
      action: () => {
        console.log('[Timer] BELL - Round ended!');
        audio.hapticFeedback([50, 100, 50]);
        audio.playBell();
      },
      triggered: false
    });
    
    return events;
  }, [audio]);

  const beginRound = useCallback(() => {
    console.log(`[Timer] Beginning round ${config.currentRound}`);
    setConfig(prev => ({ ...prev, phase: 'round' }));
    setTimeRemaining(config.roundDuration);
    setCurrentCallout('');
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = true;
    
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }
    
    // Schedule events for this round
    eventsRef.current = scheduleRoundEvents(config.roundDuration);
    let currentTime = config.roundDuration;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      currentTime--;
      setTimeRemaining(currentTime);
      
      // Check for scheduled events (Halfway, 10s left, 3-2-1 beeps, bell)
      eventsRef.current.forEach(event => {
        if (event.time === currentTime && !event.triggered) {
          event.action();
          event.triggered = true;
        }
      });
      
      // Start callouts after first 2 seconds of round, stop at 4 seconds remaining
      if (currentTime <= config.roundDuration - 2 && currentTime > 4) {
        if (!calloutScheduledRef.current && !calloutTimerRef.current) {
          scheduleNextCallout();
        }
      }
      
      // Round ended
      if (currentTime <= 0) {
        console.log('[Timer] Round ended');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (calloutTimerRef.current) {
          clearTimeout(calloutTimerRef.current);
          calloutTimerRef.current = null;
          calloutScheduledRef.current = false;
        }
        isRoundActiveRef.current = false;
        handleRoundEnd();
      }
    }, 1000);
  }, [config.roundDuration, config.currentRound, scheduleRoundEvents, scheduleNextCallout]);

  const handleRoundEnd = useCallback(() => {
    audio.playBell();
    
    if (config.currentRound >= config.rounds) {
      console.log('[Timer] Workout complete!');
      setConfig(prev => ({ ...prev, phase: 'finished' }));
      setIsRunning(false);
      setCurrentCallout('');
      calloutScheduledRef.current = false;
      isRoundActiveRef.current = false;
      if (calloutTimerRef.current) {
        clearTimeout(calloutTimerRef.current);
        calloutTimerRef.current = null;
      }
      if (audio.speakText) {
        audio.speakText('Workout complete! Great job!');
      }
      return;
    }
    
    // Start rest
    console.log(`[Timer] Starting rest for round ${config.currentRound + 1}`);
    setConfig(prev => ({ 
      ...prev, 
      phase: 'rest',
      currentRound: prev.currentRound + 1
    }));
    setTimeRemaining(config.restDuration);
    setCurrentCallout('💪 Rest');
    
    eventsRef.current = scheduleRoundEvents(config.restDuration);
    let restTime = config.restDuration;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      restTime--;
      setTimeRemaining(restTime);
      
      eventsRef.current.forEach(event => {
        if (event.time === restTime && !event.triggered) {
          event.action();
          event.triggered = true;
        }
      });
      
      if (restTime <= 0) {
        console.log('[Timer] Rest ended, starting next round');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Start countdown for next round
        startCountdown();
      }
    }, 1000);
  }, [config.currentRound, config.rounds, config.restDuration, audio, beginRound, scheduleRoundEvents]);

  // 10-second countdown with beep patterns
  const startCountdown = useCallback(() => {
    console.log('[Timer] Starting 10-second countdown');
    setConfig(prev => ({ 
      ...prev, 
      phase: 'countdown', 
      countdown: 10,
      countdownTotal: 10
    }));
    
    let count = 10;
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    countdownRef.current = setInterval(() => {
      count--;
      setConfig(prev => ({ ...prev, countdown: count }));
      
      playCountdownBeep(count);
      
      if (count <= 0) {
        console.log('[Timer] Countdown complete!');
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        beginRound();
      }
    }, 1000);
  }, [audio, beginRound, playCountdownBeep]);

  const startTimer = useCallback(async () => {
    if (isRunning) return;
    
    console.log('[Timer] Starting timer with 10-second countdown');
    setIsRunning(true);
    setIsPaused(false);
    setCurrentCallout('');
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = false;
    
    startCountdown();
  }, [isRunning, startCountdown]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || isPaused) return;
    console.log('[Timer] Paused');
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
      calloutScheduledRef.current = false;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [isRunning, isPaused]);

  const resumeTimer = useCallback(() => {
    if (!isPaused) return;
    console.log('[Timer] Resumed');
    setIsPaused(false);
    
    if (config.phase === 'countdown') {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      
      let count = config.countdown;
      countdownRef.current = setInterval(() => {
        count--;
        setConfig(prev => ({ ...prev, countdown: count }));
        
        playCountdownBeep(count);
        
        if (count <= 0) {
          console.log('[Timer] Countdown complete!');
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          beginRound();
        }
      }, 1000);
      return;
    }
    
    if (config.phase === 'round') {
      isRoundActiveRef.current = true;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      eventsRef.current = scheduleRoundEvents(config.roundDuration);
      let currentTime = timeRemaining;
      
      timerRef.current = setInterval(() => {
        currentTime--;
        setTimeRemaining(currentTime);
        
        eventsRef.current.forEach(event => {
          if (event.time === currentTime && !event.triggered) {
            event.action();
            event.triggered = true;
          }
        });
        
        if (currentTime <= config.roundDuration - 2 && currentTime > 4) {
          if (!calloutScheduledRef.current && !calloutTimerRef.current) {
            scheduleNextCallout();
          }
        }
        
        if (currentTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          isRoundActiveRef.current = false;
          handleRoundEnd();
        }
      }, 1000);
      
      if (!calloutScheduledRef.current && !calloutTimerRef.current) {
        scheduleNextCallout();
      }
    }
  }, [isPaused, config.phase, config.countdown, config.roundDuration, timeRemaining, audio, scheduleNextCallout, scheduleRoundEvents, handleRoundEnd, beginRound, playCountdownBeep]);

  const resetTimer = useCallback(() => {
    console.log('[Timer] Reset');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = false;
    eventsRef.current = [];
    setIsRunning(false);
    setIsPaused(false);
    setCurrentCallout('');
    setConfig(prev => ({ 
      ...prev, 
      phase: 'idle', 
      currentRound: 1,
      countdown: 10,
      countdownTotal: 10
    }));
    setTimeRemaining(config.roundDuration);
  }, [config.roundDuration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (calloutTimerRef.current) {
        clearTimeout(calloutTimerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return {
    config,
    timeRemaining,
    isRunning,
    isPaused,
    currentCallout,
    isDefensive,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setConfig,
  };
}