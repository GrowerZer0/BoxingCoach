'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { ROUTINE_TEMPLATES, RoutineTemplate, INTENSITY_PRESETS } from '@/types/workout';

const supabase = getSupabaseClient();

const VALID_INTENSITIES = Object.keys(INTENSITY_PRESETS); // ['flow', 'standard', 'intense', 'counter', 'pressure']

export interface RoundConfig {
  roundNumber: number;
  name: string;
  combos: string[];
  duration?: number;
}

export interface WorkoutSettings {
  roundDuration: number;
  restDuration: number;
  rounds: number;
  intensityId: string;
  roundConfigs: RoundConfig[];
  enableAudio: boolean;
  enableVoice: boolean;
  showComboDisplay: boolean;
  enableWakeLock: boolean;
  countdownSeconds: number;
  customRoutines: RoutineTemplate[];
}

const DEFAULT_ROUND_CONFIGS: RoundConfig[] = [
  ...(ROUTINE_TEMPLATES[0]?.roundConfigs || []),
];

const DEFAULT_SETTINGS: WorkoutSettings = {
  roundDuration: 180,
  restDuration: 60,
  rounds: 3,
  intensityId: 'standard',
  roundConfigs: DEFAULT_ROUND_CONFIGS,
  enableAudio: true,
  enableVoice: true,
  showComboDisplay: true,
  enableWakeLock: true,
  countdownSeconds: 10,
  customRoutines: [],
};

const sanitizeSettings = (raw: any): WorkoutSettings => {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;

  const intensityId =
    raw.intensityId && VALID_INTENSITIES.includes(raw.intensityId)
      ? raw.intensityId
      : 'standard';

  const rounds = typeof raw.rounds === 'number' && raw.rounds > 0 ? raw.rounds : DEFAULT_SETTINGS.rounds;
  let roundConfigs: RoundConfig[] = Array.isArray(raw.roundConfigs) ? raw.roundConfigs : [...DEFAULT_ROUND_CONFIGS];

  // Align roundConfigs count with rounds
  if (roundConfigs.length < rounds) {
    for (let i = roundConfigs.length + 1; i <= rounds; i++) {
      roundConfigs.push({
        roundNumber: i,
        name: `Round ${i}`,
        combos: DEFAULT_ROUND_CONFIGS[0]?.combos || [],
      });
    }
  } else if (roundConfigs.length > rounds) {
    roundConfigs = roundConfigs.slice(0, rounds);
  }

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    intensityId,
    rounds,
    roundConfigs,
    customRoutines: Array.isArray(raw.customRoutines) ? raw.customRoutines : [],
  };
};

interface SettingsContextType {
  settings: WorkoutSettings;
  updateSettings: (newSettings: Partial<WorkoutSettings>) => Promise<void>;
  updateRoundConfig: (roundNumber: number, config: Partial<RoundConfig>) => Promise<void>;
  addRoundConfig: (config: RoundConfig) => Promise<void>;
  removeRoundConfig: (roundNumber: number) => Promise<void>;
  saveCustomRoutine: (name: string, focus?: string) => Promise<RoutineTemplate>;
  deleteCustomRoutine: (routineId: string) => Promise<void>;
  saveToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WorkoutSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('workoutSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(sanitizeSettings(parsed));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('workoutSettings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSettings = async (newSettings: Partial<WorkoutSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      return sanitizeSettings(merged);
    });
  };

  const updateRoundConfig = async (roundNumber: number, config: Partial<RoundConfig>) => {
    setSettings(prev => ({
      ...prev,
      roundConfigs: prev.roundConfigs.map(rc =>
        rc.roundNumber === roundNumber
          ? { ...rc, ...config }
          : rc
      )
    }));
  };

  const addRoundConfig = async (config: RoundConfig) => {
    setSettings(prev => {
      const updatedConfigs = [...prev.roundConfigs, config];
      const updatedRounds = Math.max(prev.rounds, config.roundNumber);
      return sanitizeSettings({
        ...prev,
        rounds: updatedRounds,
        roundConfigs: updatedConfigs,
      });
    });
  };

  const removeRoundConfig = async (roundNumber: number) => {
    setSettings(prev => {
      const updatedConfigs = prev.roundConfigs.filter(rc => rc.roundNumber !== roundNumber);
      const updatedRounds = Math.max(1, prev.rounds - 1);
      return sanitizeSettings({
        ...prev,
        rounds: updatedRounds,
        roundConfigs: updatedConfigs,
      });
    });
  };

  const saveCustomRoutine = async (name: string, focus?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workout name is required');
    }

    const routine: RoutineTemplate = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      focus: focus?.trim() || 'Custom solo training workout',
      rounds: settings.rounds,
      roundDuration: settings.roundDuration,
      restDuration: settings.restDuration,
      intensityId: settings.intensityId,
      roundConfigs: settings.roundConfigs.map(round => ({
        ...round,
        combos: [...round.combos],
      })),
      isCustom: true,
    };

    setSettings(prev => ({
      ...prev,
      customRoutines: [
        routine,
        ...(prev.customRoutines || []).filter(existing => existing.name !== routine.name),
      ],
    }));

    return routine;
  };

  const deleteCustomRoutine = async (routineId: string) => {
    setSettings(prev => ({
      ...prev,
      customRoutines: (prev.customRoutines || []).filter(routine => routine.id !== routineId),
    }));
  };

  const saveToSupabase = async () => {
    if (!user || !supabase) return;

    try {
      const result = await (supabase
        .from('user_settings') as any)
        .upsert({
          user_id: user.id,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (result.error) throw result.error;
      console.log('Settings saved to Supabase');
    } catch (error) {
      console.error('Failed to save settings to Supabase:', error);
    }
  };

  const loadFromSupabase = useCallback(async () => {
    if (!user || !supabase) return;

    try {
      const result = await (supabase
        .from('user_settings') as any)
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (result.error) throw result.error;
      if (result.data?.settings) {
        const sanitized = sanitizeSettings(result.data.settings);
        setSettings(sanitized);
        localStorage.setItem('workoutSettings', JSON.stringify(sanitized));
        console.log('Settings loaded from Supabase');
      }
    } catch (error) {
      console.error('Failed to load settings from Supabase:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFromSupabase();
    }
  }, [user, loadFromSupabase]);

  const value = {
    settings,
    updateSettings,
    updateRoundConfig,
    addRoundConfig,
    removeRoundConfig,
    saveCustomRoutine,
    deleteCustomRoutine,
    saveToSupabase,
    loadFromSupabase,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}