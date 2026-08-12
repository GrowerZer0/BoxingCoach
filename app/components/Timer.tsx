// app/components/Timer.tsx - Updated with audio mode toggle
'use client';

import React, { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useSettings } from '@/contexts/SettingsContext';
import { useAudio, AudioMode } from '@/hooks/useAudio';
import { MOVE_CATEGORY_COLORS, MOVE_CATEGORY_LABELS } from '@/types/workout';

interface TimerProps {
  onWorkoutStart?: () => Promise<string | void>;
  onWorkoutEnd?: () => Promise<void>;
  currentWorkoutId?: string | null;
  roundLength?: number;
  restLength?: number;
  intensity?: string;
  minDelay?: number;
  maxDelay?: number;
  selectedVoiceName?: string;
  genderFilter?: string;
  callouts?: any;
  workoutName?: string;
}

export default function Timer(props: TimerProps) {
  const { settings } = useSettings();
  const audio = useAudio();
  const [showDebug, setShowDebug] = useState(false);
  const [audioStatus, setAudioStatus] = useState('Checking...');

  const roundDuration = settings?.roundDuration || props.roundLength || 180;
  const restDuration = settings?.restDuration || props.restLength || 60;
  const totalRounds = settings?.rounds || 3;
  const intensityId = settings?.intensityId || 'counter';

  const {
    config,
    timeRemaining,
    isRunning,
    isPaused,
    currentCallout,
    currentCalloutCategory,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  } = useTimer({
    roundDuration: roundDuration,
    restDuration: restDuration,
    rounds: totalRounds,
    intensityId: intensityId,
    audio: audio,
  });

  const { requestWakeLock, releaseWakeLock, isActive } = useWakeLock({
    onError: (error) => console.error('Wake Lock error:', error),
    onRelease: () => console.log('Wake lock released'),
  });

  // --- Wake Lock Management ---
  useEffect(() => {
    if (isRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRunning, requestWakeLock, releaseWakeLock]);

  // --- Audio Status Monitoring ---
  useEffect(() => {
    const checkAudio = async () => {
      const ctx = await audio.ensureContextReady();
      if (ctx) {
        setAudioStatus(`✅ ${ctx.state}`);
      } else {
        setAudioStatus('❌ Not Ready');
      }
    };
    checkAudio();
    const interval = setInterval(checkAudio, 5000);
    return () => clearInterval(interval);
  }, [audio]);

  // --- Test Functions ---
  const testBeep = async () => {
    console.log('🔊 Testing beep...');
    try {
      const result = await audio.playBeep();
      console.log(result ? '✅ Beep test complete' : '❌ Beep test failed');
    } catch (error) {
      console.error('❌ Beep test failed:', error);
    }
  };

  const testBell = async () => {
    console.log('🔊 Testing bell...');
    try {
      const result = await audio.playBell();
      console.log(result ? '✅ Bell test complete' : '❌ Bell test failed');
    } catch (error) {
      console.error('❌ Bell test failed:', error);
    }
  };

  const testCallout = async () => {
    console.log('🔊 Testing callout...');
    try {
      await audio.speak('jab');
      console.log('✅ Callout test complete');
    } catch (error) {
      console.error('❌ Callout test failed:', error);
    }
  };

  const testHalfway = async () => {
    console.log('🔊 Testing halfway...');
    try {
      await audio.playHalfway();
      console.log('✅ Halfway test complete');
    } catch (error) {
      console.error('❌ Halfway test failed:', error);
    }
  };

  const testTenSeconds = async () => {
    console.log('🔊 Testing 10 seconds...');
    try {
      await audio.playTenSeconds();
      console.log('✅ 10 seconds test complete');
    } catch (error) {
      console.error('❌ 10 seconds test failed:', error);
    }
  };

  const testSpeech = async () => {
    console.log('🔊 Testing speech synthesis...');
    try {
      audio.speakWithSpeechSynthesis('This is a test of speech synthesis');
      console.log('✅ Speech test complete');
    } catch (error) {
      console.error('❌ Speech test failed:', error);
    }
  };

  // --- Force Init ---
  const forceInit = async () => {
    console.log('🔊 Force initializing audio...');
    try {
      const ctx = await audio.ensureContextReady();
      const ready = audio.isContextReady();
      console.log('✅ Audio state after force init:', ready);
      setAudioStatus(ready ? '✅ Running' : '❌ Not Ready');
    } catch (error) {
      console.error('❌ Force init failed:', error);
    }
  };

  // --- Audio Mode Switching ---
  const cycleAudioMode = () => {
    const modes: AudioMode[] = ['mp3', 'speech', 'hybrid'];
    const currentIndex = modes.indexOf(audio.audioMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    audio.setMode(modes[nextIndex]);
    console.log(`🎵 Audio mode switched to: ${modes[nextIndex]}`);
  };

  // --- Formatting ---
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    switch (config.phase) {
      case 'idle': return 'Ready';
      case 'countdown': return `Starting in ${config.countdown}s...`;
      case 'round': return `Round ${config.currentRound}/${config.rounds}`;
      case 'rest': return `Rest ${config.currentRound}/${config.rounds}`;
      case 'finished': return '🎉 Workout Complete!';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (config.phase) {
      case 'round': return 'text-red-500';
      case 'rest': return 'text-green-500';
      case 'countdown': 
        return config.countdown <= 3 ? 'text-yellow-500 animate-pulse' : 'text-yellow-500';
      case 'finished': return 'text-purple-500';
      default: return 'text-white';
    }
  };

  // --- Control Handlers ---
  const handleStart = () => {
    // 1. Unlock audio synchronously
    audio.initAudio();
    audio.ensureContextReady().catch(() => {});
    audio.hapticFeedback(15);

    // 2. Unlock speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      const unlockUtterance = new SpeechSynthesisUtterance('ready');
      unlockUtterance.volume = 0.05;
      unlockUtterance.rate = 2.0;
      synth.speak(unlockUtterance);
    }

    // 3. Start timer
    requestWakeLock();
    startTimer();

    // 4. Background async work
    if (props.onWorkoutStart) {
      props.onWorkoutStart().catch(error => {
        console.error('Failed to start workout record in Supabase:', error);
      });
    }
  };

  const handleEnd = async () => {
    audio.hapticFeedback([30, 30, 30]);
    audio.cancel();
    if (props.onWorkoutEnd) {
      await props.onWorkoutEnd();
    }
    resetTimer();
  };

  const handlePause = () => {
    audio.hapticFeedback([10, 20]);
    pauseTimer();
  };

  const handleResume = () => {
    audio.hapticFeedback([20, 10]);
    audio.initAudio();
    resumeTimer();
  };

  const handleReset = () => {
    audio.hapticFeedback([30, 30, 30]);
    audio.cancel();
    resetTimer();
  };

  const isComplete = config.phase === 'finished';

  // --- Callout Handling ---
  useEffect(() => {
    if (currentCallout && (config.phase === 'round' || config.phase === 'rest')) {
      console.log(`📢 Callout: "${currentCallout}" (${currentCalloutCategory})`);
      // Audio is triggered by useTimer - it uses audio.speak internally
    }
  }, [currentCallout, currentCalloutCategory, config.phase]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="text-center w-full max-w-md">
        {/* Timer Display */}
        <div className={`text-8xl font-bold mb-2 timer-number ${getPhaseColor()}`}>
          {config.phase === 'countdown' 
            ? config.countdown 
            : formatTime(timeRemaining)}
        </div>

        <div className="text-2xl font-semibold text-gray-300 mb-1">
          {getPhaseLabel()}
        </div>

        <div className="text-sm text-gray-500 mb-4">
          {config.phase === 'countdown' && 'Get ready! 🥊'}
          {config.phase === 'round' && `Round ${config.currentRound}/${config.rounds}`}
          {config.phase === 'rest' && `Rest between rounds`}
          {isComplete && 'Great job! 🎉'}
        </div>

        {/* Progress Bar */}
        {config.phase === 'countdown' && (
          <div className="w-full mx-auto mb-8 bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-2.5 rounded-full transition-all duration-1000 bg-yellow-500"
              style={{
                width: `${(config.countdown / config.countdownTotal) * 100}%`
              }}
            />
          </div>
        )}

        {/* Callout Display */}
        {currentCallout && (config.phase === 'round' || config.phase === 'rest') && (
          <div className={`mb-6 p-4 rounded-lg transition-all duration-300 transform ${MOVE_CATEGORY_COLORS[currentCalloutCategory].panel}`}>
            <div className={`text-3xl font-bold ${MOVE_CATEGORY_COLORS[currentCalloutCategory].text}`}>
              {currentCallout}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {MOVE_CATEGORY_LABELS[currentCalloutCategory]}
            </div>
          </div>
        )}

        {/* Regular Progress Bar */}
        {config.phase !== 'countdown' && (
          <div className="w-full mx-auto mb-8 bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-2.5 rounded-full transition-all duration-1000 ${
                config.phase === 'round' ? 'bg-red-500' : 
                config.phase === 'rest' ? 'bg-green-500' : 
                isComplete ? 'bg-purple-500' : 'bg-gray-500'
              }`}
              style={{
                width: `${(timeRemaining / (config.phase === 'rest' ? config.restDuration : config.roundDuration)) * 100}%`
              }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 justify-center flex-wrap">
          {!isRunning && !isComplete && config.phase === 'idle' && (
            <button
              onClick={handleStart}
              className="px-8 py-4 text-xl font-bold text-white bg-green-600 rounded-full hover:bg-green-700 active:scale-95 transition-all"
            >
              Start Workout
            </button>
          )}

          {isRunning && !isPaused && (
            <>
              <button
                onClick={handlePause}
                className="px-8 py-4 text-xl font-bold text-white bg-yellow-600 rounded-full hover:bg-yellow-700 active:scale-95 transition-all"
              >
                ⏸ Pause
              </button>
              <button
                onClick={handleEnd}
                className="px-8 py-4 text-xl font-bold text-white bg-red-600 rounded-full hover:bg-red-700 active:scale-95 transition-all"
              >
                ⏹ Stop
              </button>
            </>
          )}

          {isRunning && isPaused && (
            <>
              <button
                onClick={handleResume}
                className="px-8 py-4 text-xl font-bold text-white bg-green-600 rounded-full hover:bg-green-700 active:scale-95 transition-all"
              >
                ▶ Resume
              </button>
              <button
                onClick={handleEnd}
                className="px-8 py-4 text-xl font-bold text-white bg-red-600 rounded-full hover:bg-red-700 active:scale-95 transition-all"
              >
                ⏹ Stop
              </button>
            </>
          )}

          {isComplete && (
            <button
              onClick={handleReset}
              className="px-8 py-4 text-xl font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 active:scale-95 transition-all"
            >
              🔄 New Workout
            </button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="mt-4 flex gap-4 justify-center text-xs text-gray-500 flex-wrap">
          {isActive && (
            <span className="text-green-500">🔋 Screen stays on</span>
          )}
          {!isActive && isRunning && (
            <span className="text-yellow-500">💤 Screen may sleep</span>
          )}
          {audio.isSpeaking() && (
            <span className="text-blue-500">🔊 Speaking...</span>
          )}
          {props.currentWorkoutId && (
            <span className="text-gray-500">ID: {props.currentWorkoutId.slice(0, 8)}</span>
          )}
        </div>

        {/* Debug Section */}
        <div className="mt-6">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>

          {showDebug && (
            <div className="mt-2 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">🔊 Audio Debug Panel</div>
              
              {/* Audio Mode */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Mode:</span>
                <button
                  onClick={cycleAudioMode}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    audio.audioMode === 'mp3' ? 'bg-blue-600' :
                    audio.audioMode === 'speech' ? 'bg-green-600' :
                    'bg-purple-600'
                  } text-white`}
                >
                  {audio.audioMode.toUpperCase()}
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                Status: {audioStatus}
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                Speaking: {audio.isSpeaking() ? '✅ YES' : '❌ NO'}
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                Context Ready: {audio.isContextReady() ? '✅ YES' : '❌ NO'}
              </div>

              <div className="text-xs text-gray-400 mb-1">Test Buttons:</div>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={forceInit}
                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors text-white"
                >
                  🔄 Force Init
                </button>
                <button
                  onClick={testBeep}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white"
                >
                  Beep
                </button>
                <button
                  onClick={testBell}
                  className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors text-white"
                >
                  Bell
                </button>
                <button
                  onClick={testCallout}
                  className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded transition-colors text-white"
                >
                  Callout
                </button>
                <button
                  onClick={testSpeech}
                  className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 rounded transition-colors text-white"
                >
                  Speech
                </button>
                <button
                  onClick={testHalfway}
                  className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded transition-colors text-white"
                >
                  Halfway
                </button>
                <button
                  onClick={testTenSeconds}
                  className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded transition-colors text-white"
                >
                  10s
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                💡 Mode: <strong>{audio.audioMode.toUpperCase()}</strong> - 
                {audio.audioMode === 'mp3' && ' Uses MP3 files (requires ringer on)'}
                {audio.audioMode === 'speech' && ' Uses text-to-speech (works on silent)'}
                {audio.audioMode === 'hybrid' && ' Tries MP3 first, falls back to speech'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}