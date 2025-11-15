// Shared metronome context for global metronome access

import { createContext, useContext, useRef, ReactNode } from 'react';
import { Metronome } from '../audio/metronome';

interface MetronomeContextType {
  getMetronome: () => Metronome | null;
}

const MetronomeContext = createContext<MetronomeContextType | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
  const metronomeRef = useRef<Metronome | null>(null);

  const getMetronome = () => {
    if (!metronomeRef.current) {
      metronomeRef.current = new Metronome(120);
    }
    return metronomeRef.current;
  };

  return (
    <MetronomeContext.Provider value={{ getMetronome }}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronome() {
  const context = useContext(MetronomeContext);
  if (!context) {
    throw new Error('useMetronome must be used within MetronomeProvider');
  }
  return context;
}
