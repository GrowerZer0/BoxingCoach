'use client';

import { useCallback, useRef, useEffect } from 'react';

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize or resume AudioContext on user interaction
  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    // Warm up speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Async helper to guarantee AudioContext is running before playing audio
  const ensureContextReady = useCallback(async () => {
    if (typeof window === 'undefined') return;
    initAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
  }, [initAudio]);

  // Check if AudioContext is initialized and running
  const isContextReady = useCallback(() => {
    return audioCtxRef.current !== null && audioCtxRef.current.state === 'running';
  }, []);


  // Safe Haptic Feedback via Vibration API
  const hapticFeedback = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently ignore if unsupported or blocked
      }
    }
  }, []);

  // Web Audio Standard Beep
  const playBeep = useCallback((freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playBeep failed:', e);
    }
  }, [initAudio]);

  // Web Audio Sustained Long Beep
  const playLongBeep = useCallback((freq = 1000, duration = 0.6, type: OscillatorType = 'sine') => {
    playBeep(freq, duration, type);
  }, [playBeep]);

  // Halfway point alert sound
  const playHalfway = useCallback(() => {
    try {
      playBeep(600, 0.2, 'sine');
      setTimeout(() => playBeep(800, 0.3, 'sine'), 120);
    } catch (e) {
      console.warn('Audio playHalfway failed:', e);
    }
  }, [playBeep]);

  // 10-second warning alert sound
  const playTenSeconds = useCallback(() => {
    try {
      playBeep(900, 0.2, 'square');
    } catch (e) {
      console.warn('Audio playTenSeconds failed:', e);
    }
  }, [playBeep]);

  // Web Audio Boxing Bell Synthesizer
  const playBell = useCallback(() => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const freqs = [800, 1230, 1640];
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
      });
    } catch (e) {
      console.warn('Audio playBell failed:', e);
    }
  }, [initAudio]);

// Text-To-Speech Callout
  const speak = useCallback((text: string, rate = 1.1) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      const synth = window.speechSynthesis;
      // Always cancel any ongoing speech and resume if paused before speaking new text
      synth.cancel();
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = synth.getVoices();
      if (voices.length > 0) {
        const defaultVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
        utterance.voice = defaultVoice;
      }

      activeUtteranceRef.current = utterance;

      utterance.onend = () => {
        activeUtteranceRef.current = null;
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        activeUtteranceRef.current = null;
      };

      synth.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis speak failed:', e);
    }
  }, []);

  // Check if Text-To-Speech is active
  const isSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }, []);

  // Preload TTS voices and update if voices change
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Initial preload
      window.speechSynthesis.getVoices();

      // Update voices if they change (e.g., new languages installed)
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };

      // Clean up the event listener
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    initAudio,
    ensureContextReady,
    isContextReady,
    hapticFeedback,
    playBell,
    playBeep,
    playLongBeep,
    playHalfway,
    playTenSeconds,
    speak,
    isSpeaking,
  };
};
