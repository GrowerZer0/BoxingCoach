'use client';

import { useCallback, useRef, useEffect } from 'react';

// Single global Web Audio Context instance
let globalAudioCtx: AudioContext | null = null;

export const initAudio = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (AudioContextClass) {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }

    if (globalAudioCtx.state === 'suspended') {
      void globalAudioCtx.resume();
    }

    // Single-frame silent buffer unlock for iOS WebKit
    try {
      const silentBuffer = globalAudioCtx.createBuffer(1, 1, 22050);
      const source = globalAudioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(globalAudioCtx.destination);
      source.start(0);
    } catch {
      // Ignore initial touch state locks
    }
  }

  return globalAudioCtx;
};

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Guarantee context is running before scheduling synth nodes
  const ensureContextReady = useCallback(async (): Promise<AudioContext | null> => {
    if (typeof window === 'undefined') return null;
    const ctx = handleInitAudio();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
    return ctx;
  }, [handleInitAudio]);

  const isContextReady = useCallback(() => {
    return globalAudioCtx !== null && globalAudioCtx.state === 'running';
  }, []);

  const hapticFeedback = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore unsupported devices
      }
    }
  }, []);

  // Web Audio Tone Synthesizer
  const playBeep = useCallback(
    async (freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
      try {
        const ctx = await ensureContextReady();
        if (!ctx || ctx.state !== 'running') return;

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
    },
    [ensureContextReady]
  );

  const playLongBeep = useCallback(
    (freq = 1000, duration = 0.6, type: OscillatorType = 'sine') => {
      void playBeep(freq, duration, type);
    },
    [playBeep]
  );

  const playHalfway = useCallback(() => {
    void playBeep(600, 0.2, 'sine');
    setTimeout(() => {
      void playBeep(800, 0.3, 'sine');
    }, 120);
  }, [playBeep]);

  const playTenSeconds = useCallback(() => {
    void playBeep(900, 0.2, 'square');
  }, [playBeep]);

  // Layered Boxing Ring Bell
  const playBell = useCallback(async () => {
    try {
      const ctx = await ensureContextReady();
      if (!ctx || ctx.state !== 'running') return;

      const freqs = [800, 1230, 1640];
      const now = ctx.currentTime;

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialVolume = idx === 0 ? 0.35 : 0.15;
        gain.gain.setValueAtTime(initialVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.5);
      });
    } catch (e) {
      console.warn('Audio playBell failed:', e);
    }
  }, [ensureContextReady]);

  // Clean TTS Execution
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

    // Only cancel ongoing speech if explicitly high priority and currently active
    if (priority === 'high' && synth.speaking) {
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

      if (onEnd) onEnd();
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    if (synth.paused) {
      synth.resume();
    }

    synth.speak(utterance);

    // Safari/Chrome keepalive check without forced pause toggles
    speechIntervalRef.current = setInterval(() => {
      if (!synth.speaking) {
        handleSpeechEnd();
      } else if (synth.paused) {
        synth.resume();
      }
    }, 3000);
  }, []);

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