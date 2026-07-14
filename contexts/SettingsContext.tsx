'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type CalloutType = {
  id: string;
  label: string;
  enabled: boolean;
  category: 'offense' | 'defense' | 'ground';
};

const DEFAULT_CALLOUTS: CalloutType[] = [
  // Offense
  { id: '1', label: '1 (Jab)', enabled: true, category: 'offense' },
  { id: '2', label: '2 (Cross)', enabled: true, category: 'offense' },
  { id: '3', label: '3 (Hook)', enabled: true, category: 'offense' },
  { id: '4', label: '4 (Uppercut)', enabled: true, category: 'offense' },
  // Defense
  { id: 'slip-left', label: 'Slip Left', enabled: true, category: 'defense' },
  { id: 'slip-right', label: 'Slip Right', enabled: true, category: 'defense' },
  { id: 'roll-left', label: 'Roll Left', enabled: true, category: 'defense' },
  { id: 'roll-right', label: 'Roll Right', enabled: true, category: 'defense' },
  { id: 'block-high', label: 'Block High', enabled: true, category: 'defense' },
  { id: 'block-low', label: 'Block Low', enabled: true, category: 'defense' },
  // Ground (new)
  { id: 'shrimp', label: 'Shrimp (Escape)', enabled: false, category: 'ground' },
  { id: 'bridge', label: 'Bridge', enabled: false, category: 'ground' },
  { id: 'takedown-def', label: 'Takedown Defense', enabled: false, category: 'ground' },
];

interface SettingsContextType {
  roundLength: number;
  setRoundLength: (val: number) => void;
  restLength: number;
  setRestLength: (val: number) => void;
  intensity: 'pressure' | 'counter';
  setIntensity: (val: 'pressure' | 'counter') => void;
  minDelay: number;
  setMinDelay: (val: number) => void;
  maxDelay: number;
  setMaxDelay: (val: number) => void;
  selectedVoiceName: string;
  setSelectedVoiceName: (name: string) => void;
  genderFilter: 'all' | 'male' | 'female';
  setGenderFilter: (val: 'all' | 'male' | 'female') => void;
  callouts: CalloutType[];
  toggleCallout: (id: string) => void;
  // recipes will be added later
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'boxing_settings';

function loadFromStorage(): Partial<SettingsContextType> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();

  const [roundLength, setRoundLength] = useState(stored.roundLength ?? 180);
  const [restLength, setRestLength] = useState(stored.restLength ?? 45);
  const [intensity, setIntensity] = useState<'pressure' | 'counter'>(stored.intensity ?? 'pressure');
  const [minDelay, setMinDelay] = useState(stored.minDelay ?? 1200);
  const [maxDelay, setMaxDelay] = useState(stored.maxDelay ?? 2800);
  const [selectedVoiceName, setSelectedVoiceName] = useState(stored.selectedVoiceName ?? '');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>(stored.genderFilter ?? 'all');
  const [callouts, setCallouts] = useState<CalloutType[]>(stored.callouts ?? DEFAULT_CALLOUTS);

  // Save to localStorage on change
  useEffect(() => {
    const toStore = {
      roundLength,
      restLength,
      intensity,
      minDelay,
      maxDelay,
      selectedVoiceName,
      genderFilter,
      callouts,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [roundLength, restLength, intensity, minDelay, maxDelay, selectedVoiceName, genderFilter, callouts]);

  const toggleCallout = (id: string) => {
    setCallouts(prev =>
      prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  return (
    <SettingsContext.Provider
      value={{
        roundLength,
        setRoundLength,
        restLength,
        setRestLength,
        intensity,
        setIntensity,
        minDelay,
        setMinDelay,
        maxDelay,
        setMaxDelay,
        selectedVoiceName,
        setSelectedVoiceName,
        genderFilter,
        setGenderFilter,
        callouts,
        toggleCallout,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}