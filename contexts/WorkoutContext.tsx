// contexts/WorkoutContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

interface WorkoutContextType {
  currentWorkoutId: string | null;
  setCurrentWorkoutId: (id: string | null) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);

  return (
    <WorkoutContext.Provider value={{ currentWorkoutId, setCurrentWorkoutId }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
}