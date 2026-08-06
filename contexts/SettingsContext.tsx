// contexts/SettingsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// Get Supabase client
const supabase = getSupabaseClient();

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
  intensityId: string; // Must be 'pressure' or 'counter' to match database
  roundConfigs: RoundConfig[];
  enableAudio: boolean;
  enableVoice: boolean;
  showComboDisplay: boolean;
  enableWakeLock: boolean;
  countdownSeconds: number;
}

const DEFAULT_ROUND_CONFIGS: RoundConfig[] = [
  { 
    roundNumber: 1, 
    name: 'Round 1 - Feeling Out', 
    combos: ['Jab', 'Cross', 'Slip Right'],
  },
  { 
    roundNumber: 2, 
    name: 'Round 2 - Building Rhythm', 
    combos: ['Jab-Cross', 'Left Hook', 'Roll Right', 'Cross'],
  },
  { 
    roundNumber: 3, 
    name: 'Round 3 - Pressure', 
    combos: ['Jab-Cross-Hook', 'Slip Left-Cross', 'Roll Right-Jab-Cross'],
  },
];

const DEFAULT_SETTINGS: WorkoutSettings = {
  roundDuration: 180,
  restDuration: 60,
  rounds: 3,
  intensityId: 'counter', // Changed from 'moderate' to 'counter'
  roundConfigs: DEFAULT_ROUND_CONFIGS,
  enableAudio: true,
  enableVoice: true,
  showComboDisplay: true,
  enableWakeLock: true,
  countdownSeconds: 3,
};

interface SettingsContextType {
  settings: WorkoutSettings;
  updateSettings: (newSettings: Partial<WorkoutSettings>) => Promise<void>;
  updateRoundConfig: (roundNumber: number, config: Partial<RoundConfig>) => Promise<void>;
  addRoundConfig: (config: RoundConfig) => Promise<void>;
  removeRoundConfig: (roundNumber: number) => Promise<void>;
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
    const savedSettings = localStorage.getItem('workoutSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Ensure intensityId is valid
        if (parsed.intensityId && !['pressure', 'counter'].includes(parsed.intensityId)) {
          parsed.intensityId = 'counter';
        }
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load settings from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('workoutSettings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSettings = async (newSettings: Partial<WorkoutSettings>) => {
    // Validate intensityId if it's being updated
    if (newSettings.intensityId && !['pressure', 'counter'].includes(newSettings.intensityId)) {
      console.warn(`Invalid intensity: ${newSettings.intensityId}, using 'counter'`);
      newSettings.intensityId = 'counter';
    }
    setSettings(prev => ({ ...prev, ...newSettings }));
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
    setSettings(prev => ({
      ...prev,
      roundConfigs: [...prev.roundConfigs, config],
      rounds: Math.max(prev.rounds, config.roundNumber)
    }));
  };

  const removeRoundConfig = async (roundNumber: number) => {
    setSettings(prev => ({
      ...prev,
      roundConfigs: prev.roundConfigs.filter(rc => rc.roundNumber !== roundNumber)
    }));
  };

  const saveToSupabase = async () => {
    if (!user) return;
    
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

  const loadFromSupabase = async () => {
    if (!user) return;
    
    try {
      const result = await (supabase
        .from('user_settings') as any)
        .select('settings')
        .eq('user_id', user.id)
        .single();
      
      if (result.error) throw result.error;
      if (result.data?.settings) {
        const parsedSettings = result.data.settings;
        // Validate intensity
        if (parsedSettings.intensityId && !['pressure', 'counter'].includes(parsedSettings.intensityId)) {
          parsedSettings.intensityId = 'counter';
        }
        setSettings(prev => ({ ...prev, ...parsedSettings }));
        localStorage.setItem('workoutSettings', JSON.stringify(parsedSettings));
        console.log('Settings loaded from Supabase');
      }
    } catch (error) {
      console.error('Failed to load settings from Supabase:', error);
    }
  };

  const value = {
    settings,
    updateSettings,
    updateRoundConfig,
    addRoundConfig,
    removeRoundConfig,
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