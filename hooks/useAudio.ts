'use client';

import { useCallback, useRef, useEffect } from 'react';

let globalAudioCtx: AudioContext | null = null;
let activeAudioSources: Set<AudioBufferSourceNode> = new Set();
let keepAliveInterval: NodeJS.Timeout | null = null;

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

    // Start keep-alive interval to prevent iOS from suspending
    if (!keepAliveInterval && globalAudioCtx.state === 'running') {
      keepAliveInterval = setInterval(() => {
        if (globalAudioCtx && globalAudioCtx.state === 'running') {
          try {
            // Play a silent buffer every 5 seconds to keep the audio bus alive
            const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
            const source = globalAudioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(globalAudioCtx.destination);
            source.start(0);
            source.onended = () => {
              source.disconnect();
            };
          } catch (e) {
            // Silent fail
          }
        }
      }, 3000); // Every 3 seconds
    }
  }

  return globalAudioCtx;
};

// Clean up keep-alive
export const cleanupAudio = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
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

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize audio context on mount
      audioCtxRef.current = initAudio();
    }

    return () => {
      // Clean up keep-alive on unmount
      cleanupAudio();
    };
  }, []);

  const handleInitAudio = useCallback((): AudioContext | null => {
    const ctx = initAudio();
    audioCtxRef.current = ctx;
    return ctx;
  }, []);

  // CRITICAL FIX: Force context to be running and keep it that way
  const ensureContextRunning = useCallback(async (ctx: AudioContext): Promise<boolean> => {
    if (!ctx) return false;

    // If context is suspended, resume it
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        // Wait a tiny bit for the context to stabilize
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
        return false;
      }
    }

    // If context is still not running, try the silent buffer trick
    if (ctx.state !== 'running') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        // Small delay to let the unlock happen
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('Silent buffer unlock failed:', e);
        return false;
      }
    }

    return ctx.state === 'running';
  }, []);

  const ensureContextReady = useCallback(async (): Promise<AudioContext | null> => {
    if (typeof window === 'undefined') return null;
    const ctx = handleInitAudio();
    if (ctx) {
      const ready = await ensureContextRunning(ctx);
      if (ready) {
        return ctx;
      }
    }
    return null;
  }, [handleInitAudio, ensureContextRunning]);

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

  // Fixed Synthesizer using properly awaited context
  const playBeep = useCallback(async (freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      const ctx = handleInitAudio();
      if (!ctx) return;

      const ready = await ensureContextRunning(ctx);
      if (!ready) {
        console.warn('AudioContext not ready for beep');
        return;
      }

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
    } catch (e) {
      console.warn('Audio playBeep failed:', e);
    }
  }, [handleInitAudio, ensureContextRunning]);

  const playLongBeep = useCallback(async (freq = 1000, duration = 0.6, type: OscillatorType = 'sine') => {
    await playBeep(freq, duration, type);
  }, [playBeep]);

  const playHalfway = useCallback(async () => {
    await playBeep(600, 0.2, 'sine');
    setTimeout(() => {
      playBeep(800, 0.3, 'sine');
    }, 120);
  }, [playBeep]);

  const playTenSeconds = useCallback(async () => {
    await playBeep(900, 0.2, 'square');
  }, [playBeep]);

  // Fixed Layered Boxing Ring Bell
  const playBell = useCallback(async () => {
    try {
      const ctx = handleInitAudio();
      if (!ctx) return;

      const ready = await ensureContextRunning(ctx);
      if (!ready) {
        console.warn('AudioContext not ready for bell');
        return;
      }

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
  }, [handleInitAudio, ensureContextRunning]);

  // FIXED: Text-To-Speech using pre-generated audio files with proper context handling
  const speakText = useCallback(async (text: string, _priority?: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      onEnd?.();
      return;
    }

    // Get or create the context
    const ctx = handleInitAudio();
    if (!ctx) {
      console.warn('No AudioContext available for speakText');
      onEnd?.();
      return;
    }

    // CRITICAL FIX: Ensure the context is running before we do anything
    const ready = await ensureContextRunning(ctx);
    if (!ready) {
      console.warn(`AudioContext not ready for speakText: "${text}"`);
      onEnd?.();
      return;
    }

    const slug = slugify(text);
    const audioPath = `/audio/${slug}.mp3`;
    const cache = audioBufferCacheRef.current;

    const playBuffer = (buffer: AudioBuffer) => {
      try {
        // Context is guaranteed to be running here
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
      } catch (e) {
        console.warn(`Failed to play audio for "${text}":`, e);
        onEnd?.();
      }
    };

    // Check cache first
    if (cache.has(slug)) {
      playBuffer(cache.get(slug)!);
      return;
    }

    // Fetch and decode the audio file
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
      onEnd?.();
    }
  }, [handleInitAudio, ensureContextRunning]);

  const isSpeaking = useCallback(() => {
    return activeAudioSources.size > 0;
  }, []);

  const cancel = useCallback(() => {
    activeAudioSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore
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
      if (cache.has(slug)) return;
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
    isSpeaking,
    cancel,
    preloadAudio,
  };
}

export default useAudio;