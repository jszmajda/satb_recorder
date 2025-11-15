// [EARS: REC-001, REC-002, REC-003, REC-004, REC-007]
// RecordButton component integrates the full recording workflow

import React, { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/recorder';
import { Metronome } from '../audio/metronome';
import { VUMeter as VUMeterClass } from '../audio/vuMeter';
import { VUMeter } from './VUMeter';
import { useErrorStore } from '../store/useErrorStore';

export interface RecordButtonProps {
  voicePartId: string;
  bpm?: number;
  onRecordingComplete: (result: { blob: Blob; duration: number }) => void;
}

type RecordingState = 'idle' | 'requesting-permission' | 'countdown' | 'recording' | 'error';

const COUNTDOWN_DURATION = 3; // seconds

/**
 * RecordButton component handles the complete recording workflow
 * [EARS: REC-001 through REC-007]
 */
export function RecordButton({
  voicePartId,
  bpm = 120,
  onRecordingComplete,
}: RecordButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_DURATION);
  const [vuLevel, setVuLevel] = useState(0);

  // Global error handling [EARS: ERR-001, ERR-003]
  const setError = useErrorStore((state) => state.setError);

  const recorderRef = useRef<Recorder | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const vuMeterRef = useRef<VUMeterClass | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vuIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize audio components
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    recorderRef.current = new Recorder(audioContextRef.current);
    metronomeRef.current = new Metronome(bpm);
    vuMeterRef.current = new VUMeterClass(audioContextRef.current);

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
      if (metronomeRef.current) {
        metronomeRef.current.stop();
        metronomeRef.current.dispose();
      }
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [bpm]);

  /**
   * Handle record button click
   * [EARS: REC-001] Request microphone permission
   */
  const handleRecordClick = async () => {
    setRecordingState('requesting-permission');
    setError(null); // Clear any previous errors

    try {
      // Request microphone permission
      const stream = await recorderRef.current!.requestMicrophoneAccess();
      streamRef.current = stream;

      // Start countdown
      setRecordingState('countdown');
      setCountdownValue(COUNTDOWN_DURATION);

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
   * [EARS: REC-002] Display countdown (3-2-1)
   */
  const startCountdown = () => {
    let count = COUNTDOWN_DURATION;
    setCountdownValue(count);

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
    }, 1000);
  };

  /**
   * Start recording
   * [EARS: REC-003] Start MediaRecorder and metronome
   * [EARS: REC-004] Display VU meter during recording
   */
  const startRecording = async () => {
    if (!streamRef.current || !recorderRef.current) return;

    setRecordingState('recording');

    // [EARS: REC-004] Connect VU meter to stream
    if (vuMeterRef.current) {
      vuMeterRef.current.connect(streamRef.current);

      // Update VU meter level periodically
      vuIntervalRef.current = window.setInterval(() => {
        if (vuMeterRef.current) {
          setVuLevel(vuMeterRef.current.getVolume());
        }
      }, 50); // Update 20 times per second
    }

    // [EARS: REC-003] Start MediaRecorder
    await recorderRef.current.startRecording(streamRef.current);

    // [EARS: REC-003] Start metronome
    if (metronomeRef.current) {
      metronomeRef.current.start();
    }
  };

  /**
   * Stop recording
   * [EARS: REC-007] Convert to WAV blob on stop
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

    // Stop metronome
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }

    try {
      // [EARS: REC-007] Stop recording and get WAV blob
      const result = await recorderRef.current.stopRecording();

      setRecordingState('idle');
      setVuLevel(0);

      // Notify parent component
      onRecordingComplete(result);
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
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* Countdown Display */}
      {/* [EARS: REC-002] Countdown display */}
      {recordingState === 'countdown' && (
        <div
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#ff9800',
          }}
        >
          {countdownValue}
        </div>
      )}

      {/* VU Meter During Recording */}
      {/* [EARS: REC-004] VU meter display during recording */}
      {recordingState === 'recording' && (
        <VUMeter level={vuLevel} width={300} height={30} />
      )}

      {/* Record / Stop Button */}
      {recordingState === 'idle' || recordingState === 'error' ? (
        <button
          onClick={handleRecordClick}
          aria-label="Record track"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ●
        </button>
      ) : recordingState === 'requesting-permission' || recordingState === 'countdown' ? (
        <button
          disabled
          aria-label="Record track"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#999',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            cursor: 'not-allowed',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ●
        </button>
      ) : (
        <button
          onClick={handleStopClick}
          aria-label="Stop recording"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            width: '80px',
            height: '80px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ■
        </button>
      )}
    </div>
  );
}
