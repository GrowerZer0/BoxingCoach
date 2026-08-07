// hooks/useTimer.ts - Complete fixed version with Mobile Audio Unlock & External Audio Context Sharing
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudio } from './useAudio';
import { useSettings } from '@/contexts/SettingsContext';
import {
  INTENSITY_PRESETS,
  MoveCategory,
  formatMoveForDisplay,
  formatMoveForSpeech,
  generateFightScenario,
  getMoveCategory,
  getRandomDelay,
} from '@/types/workout';

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

export interface UseTimerOptions extends Partial<TimerConfig> {
  audio?: ReturnType<typeof useAudio>;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { audio: externalAudio, ...initialConfig } = options;
  const { settings } = useSettings();
  
  // Use passed audio instance to share WebAudio context, or fall back to internal
  const internalAudio = useAudio();
  const audio = externalAudio || internalAudio;

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
  const [currentCalloutCategory, setCurrentCalloutCategory] = useState<MoveCategory>('striking');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<{ time: number; action: () => void; triggered: boolean }[]>([]);
  const calloutScheduledRef = useRef(false);
  const isRoundActiveRef = useRef(false);
  const isFirstRoundRef = useRef(true);

  const currentPhaseRef = useRef<TimerPhase>('idle');
  const currentRoundRef = useRef<number>(1);
  const timeRemainingRef = useRef<number>(config.roundDuration);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    currentPhaseRef.current = config.phase;
    currentRoundRef.current = config.currentRound;
  }, [config.phase, config.currentRound]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  const playCountdownBeep = useCallback((second: number, isFirstRound: boolean) => {
    console.log(`[Timer] Countdown: ${second} (first round: ${isFirstRound})`);

    if (second === 10 && isFirstRound) {
      audio.playBeep?.();
      audio.hapticFeedback?.(15);
      if (audio.speakText) {
        audio.speakText('Get ready');
      }
    } else if (second === 3 || second === 2 || second === 1) {
      audio.playBeep?.();
      audio.hapticFeedback?.(10);
    } else if (second === 0) {
      console.log('[Timer] BELL - Round starting!');
      audio.hapticFeedback?.([50, 100, 50]);
      audio.playBell?.();
    }
  }, [audio]);

  const getAvailableMoves = useCallback(() => {
    const roundNum = currentRoundRef.current;
    const currentRoundConfig = settings?.roundConfigs?.find(
      (rc: { roundNumber: number }) => rc.roundNumber === roundNum
    );

    let availableMoves: string[] = currentRoundConfig?.combos || [];

    if (availableMoves.length === 0) {
      availableMoves = generateFightScenario(roundNum, config.intensityId);
    }

    return availableMoves;
  }, [settings?.roundConfigs, config.intensityId]);

  const scheduleNextCallout = useCallback(() => {
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }

    const phase = currentPhaseRef.current;
    const isRound = phase === 'round';
    const remaining = timeRemainingRef.current;

    if (!isRound || isPaused || remaining <= 4) {
      setCurrentCallout('');
      calloutScheduledRef.current = false;
      return;
    }

    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) {
      calloutScheduledRef.current = false;
      return;
    }

    const intensity = INTENSITY_PRESETS[config.intensityId] || INTENSITY_PRESETS.counter;
    const baseDelay = getRandomDelay(intensity.minDelay, intensity.maxDelay);
    const jitter = Math.random() * 2 - 1;
    const delayBeforeSpeech = Math.max(1.5, baseDelay + jitter) * 1000;

    calloutScheduledRef.current = true;

    calloutTimerRef.current = setTimeout(() => {
      const phaseNow = currentPhaseRef.current;
      const remainingNow = timeRemainingRef.current;

      if (phaseNow !== 'round' || isPaused || remainingNow <= 4) {
        setCurrentCallout('');
        calloutScheduledRef.current = false;
        isSpeakingRef.current = false;
        return;
      }

      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const category = getMoveCategory(randomMove);
      setCurrentCalloutCategory(category);
      const displayCallout = formatMoveForDisplay(randomMove);
      setCurrentCallout(displayCallout);

      const speechText = formatMoveForSpeech(randomMove);
      const minPostSpeechRest = 2.0;
      const maxPostSpeechRest = 3.5;
      const postSpeechRest = (Math.random() * (maxPostSpeechRest - minPostSpeechRest) + minPostSpeechRest) * 1000;

      const onSpeechEnd = () => {
        isSpeakingRef.current = false;
        calloutTimerRef.current = setTimeout(() => {
          scheduleNextCallout();
        }, postSpeechRest);
      };

      isSpeakingRef.current = true;

      if (audio.speakText && settings.enableVoice) {
        audio.speakText(speechText, 'high', onSpeechEnd);
      } else {
        isSpeakingRef.current = false;
        calloutTimerRef.current = setTimeout(() => {
          scheduleNextCallout();
        }, postSpeechRest);
      }
      audio.hapticFeedback?.([15, 30, 15]);
      
    }, delayBeforeSpeech);
  }, [isPaused, config.intensityId, audio, getAvailableMoves, settings.enableVoice]);

  const scheduleRoundEvents = useCallback((duration: number) => {
    const events: { time: number; action: () => void; triggered: boolean }[] = [];

    const halfwayTime = Math.floor(duration / 2);
    events.push({
      time: halfwayTime,
      action: () => {
        audio.hapticFeedback?.([30, 50, 30]);
        if (audio.speakText) {
          audio.speakText('Halfway there');
        }
      },
      triggered: false
    });

    if (duration > 10) {
      events.push({
        time: 10,
        action: () => {
          audio.hapticFeedback?.([20, 50, 20]);
          if (audio.speakText) {
            audio.speakText('10 seconds left');
          }
        },
        triggered: false
      });
    }

    for (let i = 3; i >= 1; i--) {
      const count = i;
      events.push({
        time: count,
        action: () => {
          audio.hapticFeedback?.(10);
          audio.playBeep?.();
        },
        triggered: false
      });
    }

    events.push({
      time: 0,
      action: () => {
        audio.hapticFeedback?.([50, 100, 50]);
        audio.playBell?.();
      },
      triggered: false
    });

    return events;
  }, [audio]);

  const handleRoundEnd = useCallback(() => {
    audio.playBell?.();

    if (currentRoundRef.current >= config.rounds) {
      currentPhaseRef.current = 'finished';
      setConfig(prev => ({ ...prev, phase: 'finished' }));
      setIsRunning(false);
      setCurrentCallout('');
      calloutScheduledRef.current = false;
      isRoundActiveRef.current = false;
      isSpeakingRef.current = false;
      if (calloutTimerRef.current) {
        clearTimeout(calloutTimerRef.current);
        calloutTimerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audio.speakText) {
        audio.speakText('Workout complete! Great job!');
      }
      return;
    }

    const nextRound = currentRoundRef.current + 1;
    currentPhaseRef.current = 'rest';
    setConfig(prev => ({
      ...prev,
      phase: 'rest',
      currentRound: nextRound
    }));
    currentRoundRef.current = nextRound;
    setTimeRemaining(config.restDuration);
    timeRemainingRef.current = config.restDuration;
    setCurrentCallout('💪 Rest');

    eventsRef.current = scheduleRoundEvents(config.restDuration);
    let restTime = config.restDuration;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      restTime--;
      setTimeRemaining(restTime);
      timeRemainingRef.current = restTime;

      eventsRef.current.forEach(event => {
        if (event.time === restTime && !event.triggered) {
          event.action();
          event.triggered = true;
        }
      });

      if (restTime <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        startCountdown(false);
      }
    }, 1000);
  }, [config.rounds, config.restDuration, audio, scheduleRoundEvents]);

  const beginRound = useCallback(() => {
    const roundNum = currentRoundRef.current;
    currentPhaseRef.current = 'round';

    setConfig((prev) => ({
      ...prev,
      phase: 'round',
      currentRound: roundNum
    }));

    setTimeRemaining(config.roundDuration);
    timeRemainingRef.current = config.roundDuration;
    setCurrentCallout('');
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = true;
    isSpeakingRef.current = false;

    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    eventsRef.current = scheduleRoundEvents(config.roundDuration);
    let currentTime = config.roundDuration;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      currentTime--;
      setTimeRemaining(currentTime);
      timeRemainingRef.current = currentTime;

      eventsRef.current.forEach(event => {
        if (event.time === currentTime && !event.triggered) {
          event.action();
          event.triggered = true;
        }
      });

      if (currentTime <= config.roundDuration - 3 && currentTime > 4) {
        if (!calloutScheduledRef.current) {
          scheduleNextCallout();
        }
      }

      if (currentTime <= 0) {
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
  }, [config.roundDuration, scheduleRoundEvents, scheduleNextCallout, handleRoundEnd]);

  const startCountdown = useCallback((isFirstRound: boolean = true) => {
    currentPhaseRef.current = 'countdown';
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

      playCountdownBeep(count, isFirstRound);

      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        beginRound();
      }
    }, 1000);
  }, [beginRound, playCountdownBeep]);

  const startTimer = useCallback(async () => {
    if (isRunning) return;

    if (audio.ensureContextReady) {
      await audio.ensureContextReady();
    }
    audio.initAudio?.();

    setIsRunning(true);
    setIsPaused(false);
    setCurrentCallout('');
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = false;
    isFirstRoundRef.current = true;
    currentRoundRef.current = 1;

    startCountdown(true);
  }, [isRunning, startCountdown, audio]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || isPaused) return;
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
    isSpeakingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isRunning, isPaused]);

  const resumeTimer = useCallback(async () => {
    if (!isPaused) return;

    if (audio.ensureContextReady) {
      await audio.ensureContextReady();
    }
    audio.initAudio?.();

    setIsPaused(false);

    if (config.phase === 'countdown' || currentPhaseRef.current === 'countdown') {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      let count = config.countdown;
      const isFirstRound = config.currentRound === 1;

      countdownRef.current = setInterval(() => {
        count--;
        setConfig(prev => ({ ...prev, countdown: count }));

        playCountdownBeep(count, isFirstRound);

        if (count <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          beginRound();
        }
      }, 1000);
      return;
    }

    if (config.phase === 'round' || currentPhaseRef.current === 'round') {
      currentPhaseRef.current = 'round';
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
        timeRemainingRef.current = currentTime;

        eventsRef.current.forEach(event => {
          if (event.time === currentTime && !event.triggered) {
            event.action();
            event.triggered = true;
          }
        });

        if (currentTime <= config.roundDuration - 3 && currentTime > 4) {
          if (!calloutScheduledRef.current) {
            scheduleNextCallout();
          }
        }

        if (currentTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          isRoundActiveRef.current = false;
          isSpeakingRef.current = false;
          handleRoundEnd();
        }
      }, 1000);

      if (!calloutScheduledRef.current) {
        scheduleNextCallout();
      }
      return;
    }

    if (config.phase === 'rest' || currentPhaseRef.current === 'rest') {
      currentPhaseRef.current = 'rest';

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      eventsRef.current = scheduleRoundEvents(config.restDuration);
      let restTime = timeRemaining;

      timerRef.current = setInterval(() => {
        restTime--;
        setTimeRemaining(restTime);
        timeRemainingRef.current = restTime;

        eventsRef.current.forEach(event => {
          if (event.time === restTime && !event.triggered) {
            event.action();
            event.triggered = true;
          }
        });

        if (restTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          startCountdown(false);
        }
      }, 1000);
      return;
    }
  }, [
    isPaused,
    config.phase,
    config.countdown,
    config.currentRound,
    config.roundDuration,
    config.restDuration,
    timeRemaining,
    scheduleNextCallout,
    scheduleRoundEvents,
    handleRoundEnd,
    beginRound,
    startCountdown,
    playCountdownBeep,
    audio
  ]);

  const resetTimer = useCallback(() => {
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
    isFirstRoundRef.current = true;
    isSpeakingRef.current = false;
    eventsRef.current = [];
    currentPhaseRef.current = 'idle';
    currentRoundRef.current = 1;
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
    timeRemainingRef.current = config.roundDuration;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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
    isDefensive: currentCalloutCategory === 'defense',
    currentCalloutCategory,
    isSpeaking: isSpeakingRef.current,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setConfig,
  };
}