'use client';

import { useCallback, useRef, useEffect } from 'react';

// Module-level Web Audio Context instance to persist across re-renders
let globalAudioCtx: AudioContext | null = null;

// Standalone initAudio function to unlock Web Audio API on physical touch
export const initAudio = () => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

  if (AudioContextClass) {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }

    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch((err) => console.warn('AudioContext resume failed:', err));
    }

    // Play a 1-frame silent buffer to permanently transition audio state to 'running' on iOS
    try {
      const silentBuffer = globalAudioCtx.createBuffer(1, 1, 22050);
      const source = globalAudioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(globalAudioCtx.destination);
      source.start(0);
    } catch (e) {
      // Ignore initial touch state warnings
    }
  }

  return globalAudioCtx;
};

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with global context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioCtxRef.current = globalAudioCtx;
    }
  }, []);

  const handleInitAudio = useCallback(() => {
    const ctx = initAudio();
    audioCtxRef.current = ctx;
    return ctx;
  }, []);

  // Async helper to guarantee AudioContext is running before playing audio
  const ensureContextReady = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const ctx = handleInitAudio();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
  }, [handleInitAudio]);

  // Check if AudioContext is initialized and running
  const isContextReady = useCallback(() => {
    return globalAudioCtx !== null && globalAudioCtx.state === 'running';
  }, []);

  // Safe Haptic Feedback via Vibration API
  const hapticFeedback = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently ignore if unsupported
      }
    }
  }, []);

  // Web Audio Standard Beep
  const playBeep = useCallback((freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      const ctx = handleInitAudio();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

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
  }, [handleInitAudio]);

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
      const ctx = handleInitAudio();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

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
  }, [handleInitAudio]);

  // Text-To-Speech Callout
  const speakText = useCallback((text: string, priority?: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    const synth = window.speechSynthesis;

    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }

    if (priority === 'high') {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.volume = 1.0;

    const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
    const selectedVoice =
      voices.find((v) => v.name.toLowerCase().includes('samantha')) ||
      voices.find((v) => v.lang.startsWith('en') && v.localService) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let hasEnded = false;
    const handleSpeechEnd = () => {
      if (hasEnded) return;
      hasEnded = true;

      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }

      if (onEnd) {
        onEnd();
      }
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    if (synth.paused) {
      synth.resume();
    }

    synth.speak(utterance);

    // Chrome workaround: Keepalive heartbeat so speech doesn't randomly pause
    speechIntervalRef.current = setInterval(() => {
      if (!synth.speaking) {
        handleSpeechEnd();
      } else {
        synth.pause();
        synth.resume();
      }
    }, 5000);
  }, []);

  // Check if Text-To-Speech is active
  const isSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }, []);

  // Preload TTS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;

      const loadVoices = () => {
        voicesRef.current = synth.getVoices();
      };

      loadVoices();
      synth.onvoiceschanged = loadVoices;

      return () => {
        synth.onvoiceschanged = null;
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    initAudio: handleInitAudio,
    ensureContextReady,
    isContextReady,
    hapticFeedback,
    playBell,
    playBeep,
    playLongBeep,
    playHalfway,
    playTenSeconds,
    speakText,
    isSpeaking,
  };
};