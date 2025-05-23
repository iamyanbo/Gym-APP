import React, { createContext, useState } from 'react';

type WorkoutContextType = {
  workoutFile: string | null;
  setWorkoutFile: (file: string | null) => void;
  currentCycle: number;
  setCurrentCycle: (cycle: number) => void;
};

export const WorkoutContext = createContext<WorkoutContextType>({
  workoutFile: null,
  setWorkoutFile: () => {},
  currentCycle: 1,
  setCurrentCycle: () => {}
});

type WorkoutContextProviderProps = {
  children: React.ReactNode;
};

export const WorkoutContextProvider = ({ children }: WorkoutContextProviderProps) => {
  const [workoutFile, setWorkoutFile] = useState<string | null>(null);
  const [currentCycle, setCurrentCycle] = useState<number>(1);

  return (
    <WorkoutContext.Provider value={{ 
      workoutFile, 
      setWorkoutFile, 
      currentCycle, 
      setCurrentCycle 
    }}>
      {children}
    </WorkoutContext.Provider>
  );
};