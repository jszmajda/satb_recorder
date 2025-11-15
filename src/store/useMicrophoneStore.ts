// Store for managing microphone device selection across components
// [EARS: MIC-002, MIC-003] Global microphone device selection state

import { create } from 'zustand';

interface MicrophoneState {
  selectedDeviceId: string | null;
  setSelectedDeviceId: (deviceId: string | null) => void;
}

/**
 * Global store for microphone device selection
 * Allows MicrophoneSelector and RecordButton to share the selected device
 */
export const useMicrophoneStore = create<MicrophoneState>((set) => ({
  selectedDeviceId: null,
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
}));
