'use client';

import { useCallback, useRef, useEffect } from 'react';

let globalAudioCtx: AudioContext | null = null;
let activeAudioSources: Set<AudioBufferSourceNode> = new Set(); // Global set to track all active sources for speakText

// Synchronous unlock for Web Audio Context
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

    // Force-unlock iOS audio bus with silent buffer
    try {
      const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
      const source = globalAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(globalAudioCtx.destination);
      source.start(0);
      source.onended = () => {
        source.disconnect();
      };
    } catch {
      // Ignore initial unlock errors
    }
  }

  return globalAudioCtx;
};

// Utility to slugify text
const slugify = (text: string) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export function useAudio() { // Changed to named function export
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioCtxRef.current = globalAudioCtx;
    }
  }, []);

  const handleInitAudio = useCallback((): AudioContext | null => {
    const ctx = initAudio();
    audioCtxRef.current = ctx;
    return ctx;
  }, []);

  // Synchronously ensure context is running before executing nodes
  const ensureContextRunning = useCallback((ctx: AudioContext, callback: () => void) => {
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        callback();
      }).catch(() => {});
    } else {
      callback();
    }
  }, []);

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
        // Ignore unsupported hardware
      }
    }
  }, []);

  // Fixed Synthesizer using safely resolved execution frame
  const playBeep = useCallback((freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      const ctx = handleInitAudio();
      if (!ctx) return;

      ensureContextRunning(ctx, () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Audio playBeep failed:', e);
    }
  }, [handleInitAudio, ensureContextRunning]);

  const playLongBeep = useCallback((freq = 1000, duration = 0.6, type: OscillatorType = 'sine') => {
    playBeep(freq, duration, type);
  }, [playBeep]);

  const playHalfway = useCallback(() => {
    playBeep(600, 0.2, 'sine');
    setTimeout(() => {
      playBeep(800, 0.3, 'sine');
    }, 120);
  }, [playBeep]);

  const playTenSeconds = useCallback(() => {
    playBeep(900, 0.2, 'square');
  }, [playBeep]);

  // Fixed Layered Boxing Ring Bell
  const playBell = useCallback(() => {
    try {
      const ctx = handleInitAudio();
      if (!ctx) return;

      ensureContextRunning(ctx, () => {
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
      });
    } catch (e) {
      console.warn('Audio playBell failed:', e);
    }
  }, [handleInitAudio, ensureContextRunning]);

  // Text-To-Speech using pre-generated audio files
const speakText = useCallback(async (text: string, _priority?: string, onEnd?: () => void) => {
  if (typeof window === 'undefined') {
    onEnd?.();
    return;
  }

  // 1. Ensure the context exists and is forced to be ready
  const ctx = handleInitAudio();
  if (!ctx) {
    onEnd?.();
    return;
  }

  // 2. CRITICAL FIX: Force the context to be running synchronously if possible.
  // If it's suspended, resume it and wait for the promise to resolve.
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume(); // Wait for the resume to complete
    } catch (e) {
      console.warn('Failed to resume AudioContext before speakText:', e);
      onEnd?.();
      return;
    }
  }

  // If ctx.state is still not running after resume, we'll try to force it with a silent buffer.
  // This is the iOS unlock technique, similar to what we do in initAudio.
  if (ctx.state !== 'running') {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const unlockSource = ctx.createBufferSource();
      unlockSource.buffer = buffer;
      unlockSource.connect(ctx.destination);
      unlockSource.start(0);
      // We don't need to wait for the unlock to finish, just start it.
    } catch {
      // Ignore unlock errors
    }
  }

  // 3. If after all that, the context is still not running, give up.
  if (ctx.state !== 'running') {
    console.warn('AudioContext not running, skipping speakText:', text);
    onEnd?.();
    return;
  }

  const slug = slugify(text);
  const audioPath = `/audio/${slug}.mp3`;
  const cache = audioBufferCacheRef.current;

  const playBuffer = (buffer: AudioBuffer) => {
    // At this point, ctx.state should be 'running' because we forced it above.
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    activeAudioSources.add(source);

    source.onended = () => {
      activeAudioSources.delete(source);
      source.disconnect();
      onEnd?.();
    };
    source.start(0);
  };

  if (cache.has(slug)) {
    playBuffer(cache.get(slug)!);
    return;
  }

  try {
    const response = await fetch(audioPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${audioPath}, status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    cache.set(slug, audioBuffer);
    playBuffer(audioBuffer);
  } catch (e) {
    console.warn(`Failed to load or play audio for "${text}":`, e);
    onEnd?.(); // Ensure the callout queue doesn't hang
  }
}, [handleInitAudio]);

  const isSpeaking = useCallback(() => {
    // Check if there are any active audio sources from speakText
    return activeAudioSources.size > 0;
  }, []);

  const cancel = useCallback(() => {
    // Stop all active audio sources
    activeAudioSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        console.warn('Error stopping audio source:', e);
      }
    });
    activeAudioSources.clear();
  }, []);

  const preloadAudio = useCallback(async (texts: string[]) => {
    if (typeof window === 'undefined') return;
    const ctx = await ensureContextReady();
    if (!ctx) {
      console.warn('AudioContext not ready for preloading.');
      return;
    }

    const cache = audioBufferCacheRef.current;
    const promises = texts.map(async (text) => {
      const slug = slugify(text);
      if (cache.has(slug)) {
        return; // Already cached
      }
      const audioPath = `/audio/${slug}.mp3`;
      try {
        const response = await fetch(audioPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio file for preloading: ${audioPath}, status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        cache.set(slug, audioBuffer);
      } catch (e) {
        console.warn(`Failed to preload audio for "${text}":`, e);
      }
    });
    await Promise.all(promises);
  }, [ensureContextReady]);

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
    isSpeaking, // New
    cancel,     // New
    preloadAudio, // New
  };
}

export default useAudio; // Default export
