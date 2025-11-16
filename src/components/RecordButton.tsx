// [EARS: REC-001, REC-002, REC-003, REC-004, REC-007]
// RecordButton component integrates the full recording workflow

import React, { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/recorder';
import { VUMeter as VUMeterClass } from '../audio/vuMeter';
import { VUMeter } from './VUMeter';
import { useErrorStore } from '../store/useErrorStore';
import { useMicrophoneStore } from '../store/useMicrophoneStore';
import { useMetronome } from '../contexts/MetronomeContext';
import { useMixer } from '../contexts/MixerContext';

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

  // Get shared mixer, audio context, and loading state from context
  const { getMixer, getAudioContext, isLoading } = useMixer();
  const mixer = getMixer();
  const audioContext = getAudioContext();

  const recorderRef = useRef<Recorder | null>(null);
  const vuMeterRef = useRef<VUMeterClass | null>(null);
  const vuIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize audio components
   */
  useEffect(() => {
    if (!audioContext) return;

    recorderRef.current = new Recorder();
    vuMeterRef.current = new VUMeterClass(audioContext);

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
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
      // Note: Don't dispose mixer or close audioContext - they're shared
    };
  }, [audioContext]);

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

    // Note: Tracks are already loaded in the shared mixer by PlaybackControls

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

    // [EARS: REC-005, OVER-002] Start overdub playback FIRST
    // Start playback before recording to compensate for audio output latency
    if (overdubEnabled && mixer && tracks.length > 0 && audioContext) {
      console.log('[RecordButton] Starting playback');
      mixer.play();

      // Wait for audio latency to compensate for output delay
      // This ensures what you hear is in sync with what's being recorded
      const baseLatency = audioContext.baseLatency || 0;
      const outputLatency = (audioContext as any).outputLatency || 0;
      const totalLatency = baseLatency + outputLatency;

      if (totalLatency > 0) {
        console.log(`[RecordButton] Compensating for ${(totalLatency * 1000).toFixed(1)}ms audio latency`);
        await new Promise(resolve => setTimeout(resolve, totalLatency * 1000));
      }
    }

    // [EARS: REC-003] Start MediaRecorder after latency compensation
    await recorderRef.current.startRecording(streamRef.current);

    // [EARS: REC-004] Connect VU meter to stream (in parallel with recording)
    if (vuMeterRef.current && audioContext) {
      // Resume AudioContext before connecting analyser (required in modern browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
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
    if (mixer) {
      mixer.stop();
      mixer.seek(0); // Reset playback position to start
      // Note: Don't unload tracks - PlaybackControls manages the mixer's track state
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
          disabled={isLoading}
          style={{
            padding: '0.3rem 0.5rem',
            backgroundColor: isLoading ? '#999' : '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            minWidth: '45px',
            opacity: isLoading ? 0.6 : 1,
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
        {isLoading
          ? 'Loading tracks...'
          : recordingState === 'countdown'
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
