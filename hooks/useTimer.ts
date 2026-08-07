// hooks/useTimer.ts - Use ref for phase exclusively
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
  const [currentCalloutCategory, setCurrentCalloutCategory] = useState<MoveCategory>('striking');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef<{ time: number; action: () => void; triggered: boolean }[]>([]);
  const calloutScheduledRef = useRef(false); // Indicates if a callout (speech + post-speech delay) is currently pending
  const isRoundActiveRef = useRef(false);
  const isFirstRoundRef = useRef(true);

  // Ref to track the current phase - this is the source of truth for callouts
  const currentPhaseRef = useRef<TimerPhase>('idle');
  const currentRoundRef = useRef<number>(1);
  const timeRemainingRef = useRef<number>(config.roundDuration);
  const isSpeakingRef = useRef(false); // To prevent multiple simultaneous calls to speakText

  // Update refs when state changes
  useEffect(() => {
    currentPhaseRef.current = config.phase;
    currentRoundRef.current = config.currentRound;
  }, [config.phase, config.currentRound]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Play countdown beep pattern
  const playCountdownBeep = useCallback((second: number, isFirstRound: boolean) => {
    console.log(`[Timer] Countdown: ${second} (first round: ${isFirstRound})`);

    if (second === 10 && isFirstRound) {
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

  // Get available moves for the current round - using ref for current round
  const getAvailableMoves = useCallback(() => {
    const roundNum = currentRoundRef.current;
    console.log('[Timer] Getting available moves for round:', roundNum);

    const currentRoundConfig = settings?.roundConfigs?.find(
      (rc: { roundNumber: number }) => rc.roundNumber === roundNum
    );

    let availableMoves: string[] = currentRoundConfig?.combos || [];

    if (availableMoves.length === 0) {
      console.log('[Timer] No moves configured, using default combos');
      availableMoves = generateFightScenario(roundNum, config.intensityId);
    }

    console.log('[Timer] Available moves:', availableMoves);
    return availableMoves;
  }, [settings?.roundConfigs, config.intensityId]);

  // Schedule next callout - Using ref for phase
  const scheduleNextCallout = useCallback(() => {
    // Clear any existing callout timer before scheduling a new one.
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }

    const phase = currentPhaseRef.current;
    const isRound = phase === 'round';
    const remaining = timeRemainingRef.current;

    // Prevent callouts if not in round, paused, or very little time left (4 seconds buffer)
    if (!isRound || isPaused || remaining <= 4) {
      console.log('[Timer] Not scheduling callout - conditions not met (phase:', phase, ', remaining:', remaining, ')');
      setCurrentCallout(''); // Clear current callout display
      calloutScheduledRef.current = false;
      return;
    }

    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) {
      console.warn('[Timer] No available moves for callout!');
      calloutScheduledRef.current = false;
      return;
    }

    const intensity = INTENSITY_PRESETS[config.intensityId] || INTENSITY_PRESETS.counter;

    // This 'delayBeforeSpeech' is the time UNTIL the *next* callout SPEECH starts.
    const baseDelay = getRandomDelay(intensity.minDelay, intensity.maxDelay);
    const jitter = Math.random() * 2 - 1; // +/- 1 second
    const delayBeforeSpeech = Math.max(1.5, baseDelay + jitter) * 1000; // Minimum 1.5 seconds before speech

    console.log(`[Timer] Scheduling callout SPEECH to start in ${delayBeforeSpeech}ms`);

    calloutScheduledRef.current = true; // Indicate a callout (speech + post-speech delay) is now pending

    calloutTimerRef.current = setTimeout(() => {
      console.log('[Timer] Callout speech initiation timer fired!');

      const phaseNow = currentPhaseRef.current;
      const remainingNow = timeRemainingRef.current;

      // Re-check conditions right before speaking in case state changed during delay
      if (phaseNow !== 'round' || isPaused || remainingNow <= 4) {
        console.log('[Timer] Invalid state for callout speech at trigger time.');
        setCurrentCallout('');
        calloutScheduledRef.current = false;
        isSpeakingRef.current = false;
        return;
      }

      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      console.log('[Timer] Selected raw callout:', randomMove);

      const category = getMoveCategory(randomMove);
      setCurrentCalloutCategory(category);
      const displayCallout = formatMoveForDisplay(randomMove);
      setCurrentCallout(displayCallout);

      const speechText = formatMoveForSpeech(randomMove);
      console.log(`[Timer] Playing callout: "${displayCallout}" (speech: "${speechText}") (${category})`);

      // Calculate post-speech rest period for realism
      const minPostSpeechRest = 2.0; // seconds
      const maxPostSpeechRest = 3.5; // seconds
      const postSpeechRest = (Math.random() * (maxPostSpeechRest - minPostSpeechRest) + minPostSpeechRest) * 1000;

      const onSpeechEnd = () => {
        console.log(`[Timer] Speech ended. Scheduling next callout after ${postSpeechRest}ms rest.`);
        isSpeakingRef.current = false; // Speech has finished
        // Schedule the *next* call to scheduleNextCallout after the rest period
        calloutTimerRef.current = setTimeout(() => {
          scheduleNextCallout(); // Recursive call for the *next* callout cycle
        }, postSpeechRest);
      };

      isSpeakingRef.current = true; // Mark speech as active

      if (audio.speakText && settings.enableVoice) {
        audio.speakText(speechText, 'high', onSpeechEnd); // Pass onEnd callback
      } else {
        console.warn('[Timer] Audio.speakText not enabled or voice disabled, falling back to fixed delay for next callout.');
        // If speech not playing, immediately schedule the post-speech rest
        isSpeakingRef.current = false;
        calloutTimerRef.current = setTimeout(() => {
          scheduleNextCallout();
        }, postSpeechRest);
      }
      audio.hapticFeedback([15, 30, 15]); // Haptic feedback happens immediately with speech
      
    }, delayBeforeSpeech); // This timeout initiates the speech after the initial delay
  }, [isPaused, config.intensityId, audio, getAvailableMoves, settings.enableVoice]);

  // Schedule events for a round
  const scheduleRoundEvents = useCallback((duration: number) => {
    const events: { time: number; action: () => void; triggered: boolean }[] = [];

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
    const roundNum = currentRoundRef.current;
    console.log(`[Timer] 🔵 Beginning round ${roundNum}`);

    // Update the ref FIRST - this is the source of truth
    currentPhaseRef.current = 'round';

    // Then update state
    setConfig((prev) => {
      console.log('[Timer] Setting phase from', prev.phase, 'to round');
      return {
        ...prev,
        phase: 'round',
        currentRound: roundNum
      };
    });

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
    // Cancel any ongoing speech synthesis from previous phase/round
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
      timeRemainingRef.current = currentTime;

      // Check for scheduled events
      eventsRef.current.forEach(event => {
        if (event.time === currentTime && !event.triggered) {
          console.log(`[Timer] Event triggered at time ${currentTime}`);
          event.action();
          event.triggered = true;
        }
      });

      // Start callouts after first 3 seconds of round, if not already pending
      if (currentTime <= config.roundDuration - 3 && currentTime > 4) {
        if (!calloutScheduledRef.current) {
          console.log('[Timer] Kicking off initial callout scheduling.');
          scheduleNextCallout();
        }
      }

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
  }, [config.roundDuration, scheduleRoundEvents, scheduleNextCallout]);

  // FIX (Bug 2): startCountdown moved above handleRoundEnd so handleRoundEnd
  // can safely list it as a dependency instead of capturing a stale closure.
  const startCountdown = useCallback((isFirstRound: boolean = true) => {
    console.log(`[Timer] Starting 10-second countdown (first round: ${isFirstRound})`);
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
        console.log('[Timer] Countdown complete!');
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        beginRound();
      }
    }, 1000);
  }, [audio, beginRound, playCountdownBeep]);

  const handleRoundEnd = useCallback(() => {
    audio.playBell();

    if (currentRoundRef.current >= config.rounds) {
      console.log('[Timer] Workout complete!');
      currentPhaseRef.current = 'finished';
      setConfig(prev => ({ ...prev, phase: 'finished' }));
      setIsRunning(false);
      setCurrentCallout('');
      calloutScheduledRef.current = false;
      isRoundActiveRef.current = false;
      isSpeakingRef.current = false; // Ensure speaking state is reset
      if (calloutTimerRef.current) {
        clearTimeout(calloutTimerRef.current);
        calloutTimerRef.current = null;
      }
      // Cancel any ongoing speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audio.speakText) {
        audio.speakText('Workout complete! Great job!');
      }
      return;
    }

    const nextRound = currentRoundRef.current + 1;
    console.log(`[Timer] Starting rest for round ${nextRound}`);
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
        console.log('[Timer] Rest ended, starting next round');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        startCountdown(false);
      }
    }, 1000);
    // FIX (Bug 2): startCountdown is now declared before this callback and is
    // included in the dependency array so this never runs a stale closure.
  }, [config.rounds, config.restDuration, audio, scheduleRoundEvents, startCountdown]);

  const startTimer = useCallback(async () => {
    if (isRunning) return;

    console.log('[Timer] Starting timer with 10-second countdown');
    setIsRunning(true);
    setIsPaused(false);
    setCurrentCallout('');
    calloutScheduledRef.current = false;
    isRoundActiveRef.current = false;
    isFirstRoundRef.current = true;
    currentRoundRef.current = 1;

    startCountdown(true);
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
    isSpeakingRef.current = false;
    // Cancel any ongoing speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isRunning, isPaused]);

  const resumeTimer = useCallback(() => {
    if (!isPaused) return;
    console.log('[Timer] Resumed');
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

        // Re-initiate callout scheduling if none is pending and within active callout window
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

      // Ensure a callout is scheduled right after resume if conditions allow
      if (!calloutScheduledRef.current) {
        scheduleNextCallout();
      }
      return;
    }

    // FIX (Bug 1): previously there was no branch for the 'rest' phase, so
    // resuming a paused rest period flipped isPaused back to false but never
    // restarted the interval — the rest countdown just froze forever.
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
          console.log('[Timer] Rest ended, starting next round');
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
    audio,
    scheduleNextCallout,
    scheduleRoundEvents,
    handleRoundEnd,
    beginRound,
    startCountdown,
    playCountdownBeep
  ]);

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
    isFirstRoundRef.current = true;
    isSpeakingRef.current = false; // Ensure speaking state is reset
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
    // Cancel any ongoing speech synthesis
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
    isSpeaking: isSpeakingRef.current, // Expose current speaking state
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setConfig,
  };
}
