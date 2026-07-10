import { createContext, useContext, useState, ReactNode } from 'react';

interface WorkoutContextType {
  currentWorkoutId: string | null;
  setCurrentWorkoutId: (id: string | null) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);

  return (
    <WorkoutContext.Provider value={{ currentWorkoutId, setCurrentWorkoutId }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}

export default WorkoutContext;