// [EARS: PROJ-002, VOICE-001] Type definitions for project data models

export type VoicePartType = 'S' | 'A' | 'T' | 'B';

export interface Track {
  // [EARS: REC-010]
  id: string; // UUID
  voicePartType: VoicePartType;
  name: string; // Auto-generated: "S1", "S2", etc.
  audioBlob: Blob; // WAV audio data (uncompressed)
  duration: number; // Seconds
  volume: number; // 0-100 (maps to gain 0-1)
  muted: boolean; // [EARS: TRACK-006, TRACK-007] Boolean flag (does NOT affect GainNode)
  soloed: boolean; // [EARS: TRACK-005]
  waveformData: number[]; // [EARS: VIS-001] Sparkline visualization data (100-200 points)
  createdAt: Date;
}

export interface VoicePart {
  // [EARS: VOICE-001, VOICE-002, VOICE-003]
  type: VoicePartType;
  label: string; // "Soprano", "Alto", "Tenor", "Bass"
  expanded: boolean; // UI collapse/expand state
  tracks: Track[]; // [EARS: REC-011] Max 8 tracks per part
}

export interface Project {
  // [EARS: PROJ-001, PROJ-002, PROJ-003, PROJ-004]
  id: string; // UUID
  name: string; // User-defined project name (required at creation)
  bpm: number; // [EARS: PROJ-003] Metronome tempo (default 120)
  overdubEnabled: boolean; // [EARS: PROJ-004, OVER-001] Global overdub toggle (default false)
  createdAt: Date;
  updatedAt: Date; // [EARS: PROJ-005] Auto-updated on every change
  voiceParts: VoicePart[]; // Always 4 parts: S, A, T, B
}

export interface AudioEngineState {
  // [EARS: PLAY-001, PLAY-002, REC-001]
  isPlaying: boolean;
  isRecording: boolean;
  playheadPosition: number; // [EARS: PLAY-004, SEEK-001] Seconds
  duration: number; // Total project duration (longest track)
  selectedMicrophoneId: string | null; // [EARS: MIC-002, MIC-003] Selected microphone device ID
  availableMicrophones: MediaDeviceInfo[]; // [EARS: MIC-001] List of available mics
}

export interface UndoState {
  // [EARS: TRACK-001, TRACK-003, TRACK-004] Single-level undo for deleted tracks
  lastDeletedTrack: Track | null;
  lastDeletedFromVoicePart: VoicePartType | null;
}
