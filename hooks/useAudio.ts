'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

// --- Global State ---
let globalAudioCtx: AudioContext | null = null;
let activeAudioSources: Set<AudioBufferSourceNode> = new Set();
let keepAliveInterval: NodeJS.Timeout | null = null;
let audioUnlocked = false;

// --- Audio Mode Types ---
export type AudioMode = 'mp3' | 'speech' | 'hybrid';

// --- Utility Functions ---
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

// --- Audio Context Management ---
export const initAudio = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    globalAudioCtx = new AudioContextClass();
  }

  // Resume if suspended
  if (globalAudioCtx.state === 'suspended') {
    void globalAudioCtx.resume();
  }

  // Unlock with silent buffer
  try {
    const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
    const source = globalAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(globalAudioCtx.destination);
    source.start(0);
    source.onended = () => source.disconnect();
    audioUnlocked = true;
  } catch {
    // Ignore initial unlock errors
  }

  // Start keep-alive to prevent iOS suspension
  if (!keepAliveInterval && globalAudioCtx.state === 'running') {
    keepAliveInterval = setInterval(() => {
      if (globalAudioCtx && globalAudioCtx.state === 'running') {
        try {
          const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
          const source = globalAudioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(globalAudioCtx.destination);
          source.start(0);
          source.onended = () => source.disconnect();
        } catch {
          // Silent fail
        }
      }
    }, 3000);
  }

  return globalAudioCtx;
};

export const cleanupAudio = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (globalAudioCtx) {
    try {
      globalAudioCtx.close();
    } catch {
      // Ignore
    }
    globalAudioCtx = null;
  }
  audioUnlocked = false;
};

// --- Main Hook ---
export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const [audioMode, setAudioMode] = useState<AudioMode>('hybrid');
  const [isReady, setIsReady] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const ctx = initAudio();
    audioCtxRef.current = ctx;
    setIsReady(ctx?.state === 'running');

    return () => {
      cleanupAudio();
    };
  }, []);

  // --- Core Audio Functions ---

  const ensureContextRunning = useCallback(async (ctx: AudioContext): Promise<boolean> => {
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
        return false;
      }
    }

    if (ctx.state !== 'running') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
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
    const ctx = initAudio();
    audioCtxRef.current = ctx;
    if (ctx) {
      const ready = await ensureContextRunning(ctx);
      setIsReady(ready);
      return ready ? ctx : null;
    }
    return null;
  }, [ensureContextRunning]);

  const isContextReady = useCallback(() => {
    return globalAudioCtx !== null && globalAudioCtx.state === 'running';
  }, []);

  // --- Haptic Feedback ---
  const hapticFeedback = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore unsupported hardware
      }
    }
  }, []);

  // --- Synthesized Beeps ---
  const playBeep = useCallback(async (freq = 800, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      const ctx = initAudio();
      if (!ctx) return false;

      const ready = await ensureContextRunning(ctx);
      if (!ready) return false;

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
      
      return true;
    } catch (e) {
      console.warn('Audio playBeep failed:', e);
      return false;
    }
  }, [ensureContextRunning]);

  const playLongBeep = useCallback(async (freq = 1000, duration = 0.6, type: OscillatorType = 'sine') => {
    return await playBeep(freq, duration, type);
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

  const playBell = useCallback(async () => {
    try {
      const ctx = initAudio();
      if (!ctx) return false;

      const ready = await ensureContextRunning(ctx);
      if (!ready) return false;

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
      
      return true;
    } catch (e) {
      console.warn('Audio playBell failed:', e);
      return false;
    }
  }, [ensureContextRunning]);

  // --- Speech Synthesis (Works on Silent Mode) ---
  const speakWithSpeechSynthesis = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not available');
      onEnd?.();
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        console.log(`✅ Speech synthesis ended: "${text}"`);
        onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn(`Speech synthesis error for "${text}":`, e);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis failed:', e);
      onEnd?.();
    }
  }, []);

  // --- MP3 Playback via Web Audio ---
  const speakText = useCallback(async (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      onEnd?.();
      return false;
    }

    console.log(`🔊 MP3 speak: "${text}"`);

    const ctx = initAudio();
    if (!ctx) {
      onEnd?.();
      return false;
    }

    const ready = await ensureContextRunning(ctx);
    if (!ready) {
      console.warn(`AudioContext not ready for: "${text}"`);
      onEnd?.();
      return false;
    }

    const slug = slugify(text);
    const audioPath = `/audio/${slug}.mp3`;
    const cache = audioBufferCacheRef.current;

    const playBuffer = (buffer: AudioBuffer) => {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        activeAudioSources.add(source);

        source.onended = () => {
          activeAudioSources.delete(source);
          source.disconnect();
          onEnd?.();
        };

        // AudioBufferSourceNode doesn't have onerror, use try/catch instead
        source.start(0);
        return true;
      } catch (e) {
        console.error(`Failed to play: "${text}"`, e);
        onEnd?.();
        return false;
      }
    };

    if (cache.has(slug)) {
      return playBuffer(cache.get(slug)!);
    }

    try {
      const response = await fetch(audioPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${audioPath}, status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      cache.set(slug, audioBuffer);
      return playBuffer(audioBuffer);
    } catch (e) {
      console.warn(`Failed to load audio for "${text}":`, e);
      onEnd?.();
      return false;
    }
  }, [ensureContextRunning]);

  // --- HTML5 Audio Fallback ---
  const playWithHTML5 = useCallback((audioPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioPath);
      
      audio.onended = () => {
        audio.src = ''; // Clean up
        resolve();
      };
      
      audio.onerror = (e) => {
        audio.src = ''; // Clean up
        reject(e);
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          audio.src = ''; // Clean up
          reject(error);
        });
      }
    });
  }, []);

  // --- Unified Speak (Hybrid Mode) ---
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    console.log(`🎯 Speaking: "${text}" (mode: ${audioMode})`);

    if (audioMode === 'speech') {
      speakWithSpeechSynthesis(text, onEnd);
      return true;
    }

    if (audioMode === 'mp3') {
      return await speakText(text, onEnd);
    }

    // Hybrid mode: Try MP3 first, fallback to speech synthesis
    try {
      const success = await speakText(text, () => {
        // MP3 completed
        onEnd?.();
      });
      
      if (success) {
        return true;
      }
      
      // MP3 failed, use speech synthesis
      console.log('MP3 failed, falling back to speech synthesis');
      speakWithSpeechSynthesis(text, onEnd);
      return true;
      
    } catch (e) {
      console.warn('MP3 playback error, using speech synthesis:', e);
      speakWithSpeechSynthesis(text, onEnd);
      return true;
    }
  }, [audioMode, speakText, speakWithSpeechSynthesis]);

  // --- Cancel All Audio ---
  const cancel = useCallback(() => {
    // Cancel Web Audio
    activeAudioSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore
      }
    });
    activeAudioSources.clear();

    // Cancel Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }, []);

  const isSpeaking = useCallback(() => {
    if (activeAudioSources.size > 0) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }, []);

  // --- Preload Audio Files ---
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
        if (!response.ok) throw new Error(`Failed to fetch: ${audioPath}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        cache.set(slug, audioBuffer);
      } catch (e) {
        console.warn(`Failed to preload "${text}":`, e);
      }
    });
    await Promise.all(promises);
  }, [ensureContextReady]);

  // --- Set Audio Mode ---
  const setMode = useCallback((mode: AudioMode) => {
    console.log(`Setting audio mode to: ${mode}`);
    setAudioMode(mode);
  }, []);

  return {
    // Core
    initAudio,
    ensureContextReady,
    isContextReady,
    isReady,
    
    // Haptics
    hapticFeedback,
    
    // Synthesized sounds (always work)
    playBeep,
    playLongBeep,
    playHalfway,
    playTenSeconds,
    playBell,
    
    // Unified speak (works everywhere)
    speak,
    
    // Individual methods (for testing)
    speakText,
    speakWithSpeechSynthesis,
    playWithHTML5,
    
    // Control
    cancel,
    isSpeaking,
    preloadAudio,
    
    // Settings
    audioMode,
    setMode,
  };
}

export default useAudio;