// hooks/useAudio.ts - Force context initialization
import { useRef, useEffect, useState, useCallback } from 'react';

// Check if we're on iOS
const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<{
    bell?: AudioBuffer;
    beep?: AudioBuffer;
    longBeep?: AudioBuffer;
    halfway?: AudioBuffer;
    tenSeconds?: AudioBuffer;
  }>({});
  const [isContextReady, setIsContextReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isClosedRef = useRef(false);
  const isInitializedRef = useRef(false);

  // --- SIMPLER Audio Generation Functions ---
  const createBellSound = (ctx: AudioContext): AudioBuffer => {
    const duration = 0.4;
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    const freq1 = 660;
    const freq2 = 880;
    
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 3);
      data[i] = (Math.sin(2 * Math.PI * freq1 * t) * 0.5 + 
                 Math.sin(2 * Math.PI * freq2 * t) * 0.3) * decay * 0.5;
    }
    
    return buffer;
  };

  const createBeepSound = (ctx: AudioContext, duration: number = 0.1, frequency: number = 800): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3;
    }
    
    return buffer;
  };

  const createHalfwaySound = (ctx: AudioContext): AudioBuffer => {
    const duration = 0.3;
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    const freq = 600;
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const modulation = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t);
      data[i] = Math.sin(2 * Math.PI * freq * t) * modulation * 0.3;
    }
    
    return buffer;
  };

  const createTenSecondsSound = (ctx: AudioContext): AudioBuffer => {
    const duration = 0.2;
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    const freq = 1000;
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.02);
      data[i] = Math.sin(2 * Math.PI * freq * t) * attack * 0.4;
    }
    
    return buffer;
  };

  // --- Generate Audio Buffers ---
  const generateAudioBuffers = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      console.warn('[Audio] Cannot generate buffers - context not ready');
      return false;
    }
    
    try {
      audioBuffersRef.current.bell = createBellSound(ctx);
      audioBuffersRef.current.beep = createBeepSound(ctx, 0.1, 800);
      audioBuffersRef.current.longBeep = createBeepSound(ctx, 0.3, 800);
      audioBuffersRef.current.halfway = createHalfwaySound(ctx);
      audioBuffersRef.current.tenSeconds = createTenSecondsSound(ctx);
      console.log('[Audio] All buffers generated!');
      return true;
    } catch (error) {
      console.error('[Audio] Failed to generate buffers:', error);
      return false;
    }
  }, []);

  // --- Initialize Audio Context (FORCED) ---
  const initAudioContext = useCallback(() => {
    if (isClosedRef.current) {
      isClosedRef.current = false;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log('[Audio] Using existing AudioContext, state:', audioContextRef.current.state);
      return audioContextRef.current;
    }
    
    try {
      console.log('[Audio] Creating new AudioContext');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Generate audio buffers immediately
      generateAudioBuffers();
      
      // IMPORTANT: Resume the context right away
      audioContextRef.current.resume().then(() => {
        console.log('[Audio] Context resumed, state:', audioContextRef.current?.state);
        setIsContextReady(true);
        isInitializedRef.current = true;
      }).catch((err) => {
        console.warn('[Audio] Resume failed:', err);
        // Try one more time with a delay
        setTimeout(() => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              console.log('[Audio] Context resumed (retry)');
              setIsContextReady(true);
              isInitializedRef.current = true;
            });
          }
        }, 500);
      });
      
      return audioContextRef.current;
    } catch (error) {
      console.error('[Audio] Failed to create AudioContext:', error);
      return null;
    }
  }, [generateAudioBuffers]);

  // --- Resume Audio Context (FORCED) ---
  const ensureContextReady = useCallback(async () => {
    console.log('[Audio] ensureContextReady called');
    
    // If already ready, return
    if (isContextReady && isInitializedRef.current) {
      console.log('[Audio] Already ready');
      return;
    }
    
    // Try to get or create context
    let ctx = audioContextRef.current;
    
    if (!ctx || ctx.state === 'closed') {
      console.log('[Audio] No context or closed, creating new');
      ctx = initAudioContext();
      if (!ctx) {
        console.warn('[Audio] Failed to create context');
        return;
      }
    }
    
    // Try to resume if suspended
    if (ctx.state === 'suspended') {
      console.log('[Audio] Resuming suspended context');
      try {
        await ctx.resume();
        console.log('[Audio] Context resumed, state:', ctx.state);
        setIsContextReady(true);
        isInitializedRef.current = true;
      } catch (error) {
        console.warn('[Audio] Resume failed:', error);
        // Force resume by creating a new context
        console.log('[Audio] Forcing new context creation');
        audioContextRef.current = null;
        ctx = initAudioContext();
        if (ctx && ctx.state === 'suspended') {
          await ctx.resume();
        }
      }
    } else if (ctx.state === 'running') {
      console.log('[Audio] Context already running');
      setIsContextReady(true);
      isInitializedRef.current = true;
    }
    
    // Check and regenerate buffers if needed
    if (!audioBuffersRef.current.beep) {
      console.log('[Audio] Buffers missing, regenerating...');
      generateAudioBuffers();
    }
  }, [initAudioContext, generateAudioBuffers, isContextReady]);

  // --- Play Sound ---
  const playSound = useCallback(async (buffer: AudioBuffer, name: string) => {
    console.log(`[Audio] Playing ${name}...`);
    
    // Force context ready
    await ensureContextReady();
    
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state !== 'running') {
      console.warn(`[Audio] Cannot play ${name} - context not running (state: ${ctx?.state})`);
      // Try one more time with a fresh context
      audioContextRef.current = null;
      const newCtx = initAudioContext();
      if (newCtx) {
        await newCtx.resume();
        if (newCtx.state === 'running') {
          // Retry playing
          try {
            const source = newCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(newCtx.destination);
            source.start(0);
            console.log(`[Audio] ${name} played successfully (retry)`);
          } catch (error) {
            console.warn(`[Audio] Failed to play ${name} (retry):`, error);
          }
        }
      }
      return;
    }
    
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      console.log(`[Audio] ${name} played successfully`);
    } catch (error) {
      console.warn(`[Audio] Failed to play ${name}:`, error);
    }
  }, [ensureContextReady, initAudioContext]);

  // --- Haptic Feedback ---
  const hapticFeedback = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Silently fail
      }
    }
  };

  // --- Text-to-Speech ---
  const speakText = (text: string, priority: 'high' | 'low' = 'high'): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      setIsSpeaking(true);

      if (priority === 'high') {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
      ) || voices.find(v => v.lang.startsWith('en')) || null;
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const updatedVoices = window.speechSynthesis.getVoices();
          const betterVoice = updatedVoices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.includes('Female') || v.name.includes('Samantha'))
          ) || updatedVoices.find(v => v.lang.startsWith('en')) || null;
          
          if (betterVoice) {
            utterance.voice = betterVoice;
          }
          window.speechSynthesis.speak(utterance);
        };
      } else {
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  // --- Preload Voices ---
  const preloadVoices = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  };

  // --- Main Audio Functions ---
  const playBell = useCallback(async () => {
    console.log('[Audio] playBell called');
    hapticFeedback([50, 100, 50]);
    if (audioBuffersRef.current.bell) {
      await playSound(audioBuffersRef.current.bell, 'bell');
    } else {
      console.warn('[Audio] Bell buffer not ready, regenerating...');
      generateAudioBuffers();
      if (audioBuffersRef.current.bell) {
        await playSound(audioBuffersRef.current.bell, 'bell');
      }
    }
  }, [playSound, generateAudioBuffers]);

  const playBeep = useCallback(async () => {
    console.log('[Audio] playBeep called');
    hapticFeedback(10);
    if (audioBuffersRef.current.beep) {
      await playSound(audioBuffersRef.current.beep, 'beep');
    } else {
      console.warn('[Audio] Beep buffer not ready, regenerating...');
      generateAudioBuffers();
      if (audioBuffersRef.current.beep) {
        await playSound(audioBuffersRef.current.beep, 'beep');
      }
    }
  }, [playSound, generateAudioBuffers]);

  const playLongBeep = useCallback(async () => {
    console.log('[Audio] playLongBeep called');
    hapticFeedback(20);
    if (audioBuffersRef.current.longBeep) {
      await playSound(audioBuffersRef.current.longBeep, 'longBeep');
    } else {
      await playBeep();
    }
  }, [playBeep, playSound]);

  const playHalfway = useCallback(async () => {
    console.log('[Audio] playHalfway called');
    hapticFeedback([30, 50, 30]);
    try {
      await speakText("Halfway there");
      return;
    } catch (error) {
      console.warn('TTS failed, using audio cue:', error);
    }
    if (audioBuffersRef.current.halfway) {
      await playSound(audioBuffersRef.current.halfway, 'halfway');
    }
  }, [playSound]);

  const playTenSeconds = useCallback(async () => {
    console.log('[Audio] playTenSeconds called');
    hapticFeedback([20, 50, 20]);
    try {
      await speakText("10 seconds left");
      return;
    } catch (error) {
      console.warn('TTS failed, using audio cue:', error);
    }
    if (audioBuffersRef.current.tenSeconds) {
      await playSound(audioBuffersRef.current.tenSeconds, 'tenSeconds');
    }
  }, [playSound]);

  // --- Setup Effect ---
  useEffect(() => {
    console.log('[Audio] Setting up audio...');
    
    // Initialize immediately
    initAudioContext();
    
    // Setup click handler to resume audio on user interaction
    const resumeOnInteraction = async () => {
      console.log('[Audio] User interaction detected');
      await ensureContextReady();
    };
    
    document.addEventListener('click', resumeOnInteraction);
    document.addEventListener('touchstart', resumeOnInteraction);
    
    // Also try to resume on visibility change (when tab becomes visible)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Audio] Tab became visible, resuming...');
        ensureContextReady();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    return () => {
      console.log('[Audio] Cleaning up...');
      document.removeEventListener('click', resumeOnInteraction);
      document.removeEventListener('touchstart', resumeOnInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      
      if (audioContextRef.current && 
          audioContextRef.current.state !== 'closed' && 
          !isClosedRef.current) {
        try {
          audioContextRef.current.close();
          isClosedRef.current = true;
        } catch (error) {
          // Ignore
        }
      }
    };
  }, [initAudioContext, ensureContextReady]);

  return {
    playBell,
    playBeep,
    playLongBeep,
    playHalfway,
    playTenSeconds,
    speakText,
    isSpeaking,
    preloadVoices,
    hapticFeedback,
    ensureContextReady,
    isContextReady,
    resumeContext: ensureContextReady,
  };
}