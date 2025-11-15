// [EARS: REC-001, REC-002, REC-003, REC-004, REC-007]
// RecordButton component integrates the full recording workflow

import React, { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/recorder';
import { VUMeter as VUMeterClass } from '../audio/vuMeter';
import { VUMeter } from './VUMeter';
import { Mixer } from '../audio/mixer';
import { useErrorStore } from '../store/useErrorStore';
import { useMicrophoneStore } from '../store/useMicrophoneStore';
import { useMetronome } from '../contexts/MetronomeContext';

export interface RecordButtonTrack {
  id: string;
  audioBlob: Blob;
  volume: number;
  muted: boolean;
  soloed: boolean;
}

export interface RecordButtonProps {
  voicePartId: string;
  bpm?: number;
  overdubEnabled?: boolean;
  tracks?: RecordButtonTrack[];
  onRecordingComplete: (result: { blob: Blob; duration: number }) => void;
}

type RecordingState = 'idle' | 'requesting-permission' | 'countdown' | 'recording' | 'error';

const COUNTDOWN_BEATS = 5; // Number of beats to count down

/**
 * RecordButton component handles the complete recording workflow
 * [EARS: REC-001 through REC-007, REC-005, OVER-002]
 */
export function RecordButton({
  voicePartId,
  bpm = 120,
  overdubEnabled = false,
  tracks = [],
  onRecordingComplete,
}: RecordButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_BEATS);
  const [vuLevel, setVuLevel] = useState(0);

  // Global error handling [EARS: ERR-001, ERR-003]
  const setError = useErrorStore((state) => state.setError);

  // Global microphone selection (shared with MicrophoneSelector)
  // [EARS: MIC-003] Use selected device for recording
  const selectedDeviceId = useMicrophoneStore((state) => state.selectedDeviceId);

  // Get shared metronome instance from context
  const { getMetronome } = useMetronome();

  const recorderRef = useRef<Recorder | null>(null);
  const vuMeterRef = useRef<VUMeterClass | null>(null);
  const mixerRef = useRef<Mixer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vuIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize audio components
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    recorderRef.current = new Recorder();
    vuMeterRef.current = new VUMeterClass(audioContextRef.current);
    mixerRef.current = new Mixer(audioContextRef.current);

    return () => {
      if (vuIntervalRef.current) {
        clearInterval(vuIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (vuMeterRef.current) {
        vuMeterRef.current.disconnect();
      }
      if (mixerRef.current) {
        mixerRef.current.dispose();
      }
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Handle record button click
   * [EARS: REC-001] Request microphone permission
   * [EARS: MIC-003] Use selected device for recording
   */
  const handleRecordClick = async () => {
    setRecordingState('requesting-permission');
    setError(null); // Clear any previous errors

    try {
      // Set selected device on recorder before requesting access
      // This ensures we use the device selected in MicrophoneSelector
      if (recorderRef.current) {
        recorderRef.current.setSelectedDevice(selectedDeviceId);
      }

      // Request microphone permission with selected device
      const stream = await recorderRef.current!.requestMicrophoneAccess();
      streamRef.current = stream;

      // Start countdown
      setRecordingState('countdown');
      setCountdownValue(COUNTDOWN_BEATS);

      // [EARS: REC-002] Display countdown
      startCountdown();
    } catch (error) {
      // [EARS: ERR-001] Display error on permission denied
      setRecordingState('error');
      setError('Microphone permission denied. Please allow access to record.');
    }
  };

  /**
   * Start countdown before recording
   * [EARS: REC-002] Display countdown (5-4-3-2-1) synced to metronome beats
   */
  const startCountdown = () => {
    let count = COUNTDOWN_BEATS;
    setCountdownValue(count);

    // Start metronome during countdown so user can feel the tempo
    const metronome = getMetronome();
    if (metronome) {
      metronome.start();
    }

    // Get current BPM from metronome instance for accurate countdown timing
    const currentBpm = metronome ? metronome.getBpm() : bpm;
    const beatIntervalMs = 60000 / currentBpm;

    countdownIntervalRef.current = window.setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        startRecording();
      }
    }, beatIntervalMs);
  };

  /**
   * Start recording
   * [EARS: REC-003] Start MediaRecorder and metronome
   * [EARS: REC-004] Display VU meter during recording
   * [EARS: REC-005, OVER-002] Play existing tracks if overdub enabled
   */
  const startRecording = async () => {
    if (!streamRef.current || !recorderRef.current) return;

    setRecordingState('recording');

    // [EARS: REC-003] Start MediaRecorder IMMEDIATELY to avoid delay
    // Note: Start recording first, then set up other features in parallel
    await recorderRef.current.startRecording(streamRef.current);

    // [EARS: REC-004] Connect VU meter to stream (in parallel with recording)
    if (vuMeterRef.current && audioContextRef.current) {
      // Resume AudioContext before connecting analyser (required in modern browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      vuMeterRef.current.connect(streamRef.current);

      // Update VU meter level periodically using setInterval
      // Use 50ms (20fps) to balance smoothness with performance
      vuIntervalRef.current = window.setInterval(() => {
        if (vuMeterRef.current) {
          setVuLevel(vuMeterRef.current.getVolume());
        }
      }, 50);
    }

    // [EARS: REC-005, OVER-002] Load and play overdub tracks in background (don't block recording)
    if (overdubEnabled && mixerRef.current && tracks.length > 0) {
      // Load tracks asynchronously without blocking
      (async () => {
        try {
          // Load all tracks into mixer
          for (const track of tracks) {
            await mixerRef.current!.loadTrack(track.id, track.audioBlob);
            // Set track volume, mute, and solo states
            mixerRef.current!.setVolume(track.id, track.volume);
            mixerRef.current!.setMuted(track.id, track.muted);
            mixerRef.current!.setSoloed(track.id, track.soloed);
          }
          // Start playback
          mixerRef.current!.play();
        } catch (error) {
          console.error('Failed to load/play overdub tracks:', error);
          // Continue recording even if overdub playback fails
        }
      })();
    }

    // Note: Metronome already started during countdown (see startCountdown())
  };

  /**
   * Stop recording
   * [EARS: REC-007] Convert to WAV blob on stop
   * [EARS: REC-005, OVER-002] Stop mixer playback if overdub was enabled
   */
  const handleStopClick = async () => {
    if (!recorderRef.current) return;

    // Stop VU meter updates
    if (vuIntervalRef.current) {
      clearInterval(vuIntervalRef.current);
      vuIntervalRef.current = null;
    }

    // Disconnect VU meter
    if (vuMeterRef.current) {
      vuMeterRef.current.disconnect();
    }

    // [EARS: REC-005, OVER-002] Stop mixer if overdub was enabled
    if (mixerRef.current) {
      mixerRef.current.stop();
    }

    // Stop metronome
    const metronome = getMetronome();
    if (metronome) {
      metronome.stop();
    }

    try {
      // [EARS: REC-007] Stop recording and get WAV blob
      const result = await recorderRef.current.stopRecording();

      setRecordingState('idle');
      setVuLevel(0);

      // Notify parent component (map audioBlob to blob for callback)
      onRecordingComplete({
        blob: result.audioBlob,
        duration: result.duration,
      });
    } catch (error) {
      // [EARS: ERR-003] Display error on encoding failure
      setRecordingState('error');
      setError('Recording failed. Please try again.');
    }
  };

  return (
    <div
      className="record-button-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '3px',
        marginBottom: '0.3rem',
      }}
    >
      {/* Record / Stop Button */}
      {recordingState === 'idle' || recordingState === 'error' ? (
        <button
          onClick={handleRecordClick}
          aria-label="Record track"
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            minWidth: '45px',
          }}
        >
          Rec
        </button>
      ) : recordingState === 'requesting-permission' || recordingState === 'countdown' ? (
        <button
          disabled
          aria-label="Record track"
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: '#999',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'not-allowed',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            minWidth: '45px',
          }}
        >
          {recordingState === 'countdown' ? countdownValue : 'Rec'}
        </button>
      ) : (
        <button
          onClick={handleStopClick}
          aria-label="Stop recording"
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            minWidth: '45px',
          }}
        >
          Stop
        </button>
      )}

      {/* Label / Status Text */}
      <span
        style={{
          fontSize: '0.8rem',
          color: '#aaa',
          minWidth: '100px',
        }}
      >
        {recordingState === 'countdown'
          ? 'Get ready...'
          : recordingState === 'recording'
          ? 'Recording...'
          : recordingState === 'requesting-permission'
          ? 'Requesting mic...'
          : 'New track'}
      </span>

      {/* VU Meter During Recording */}
      {/* [EARS: REC-004] VU meter display during recording */}
      {recordingState === 'recording' && (
        <div style={{ flex: 1, minWidth: '150px' }}>
          <VUMeter level={vuLevel} width={250} height={30} />
        </div>
      )}
    </div>
  );
}
