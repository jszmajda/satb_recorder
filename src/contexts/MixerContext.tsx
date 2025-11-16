// Context for sharing the audio mixer across components
// This ensures only one mixer instance exists, reducing memory usage

import React, { createContext, useContext, useRef, ReactNode, useEffect, useState } from 'react';
import { Mixer } from '../audio/mixer';

interface MixerContextValue {
  getMixer: () => Mixer | null;
  getAudioContext: () => AudioContext | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const MixerContext = createContext<MixerContextValue | null>(null);

export function MixerProvider({ children }: { children: ReactNode }) {
  const mixerRef = useRef<Mixer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Create shared audio context and mixer
    audioContextRef.current = new AudioContext();
    mixerRef.current = new Mixer(audioContextRef.current);

    return () => {
      // Clean up on unmount
      if (mixerRef.current) {
        mixerRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getMixer = () => mixerRef.current;
  const getAudioContext = () => audioContextRef.current;

  return (
    <MixerContext.Provider value={{ getMixer, getAudioContext, isLoading, setIsLoading }}>
      {children}
    </MixerContext.Provider>
  );
}

export function useMixer() {
  const context = useContext(MixerContext);
  if (!context) {
    throw new Error('useMixer must be used within MixerProvider');
  }
  return context;
}
