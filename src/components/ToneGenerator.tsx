// [EARS: TONE-003, TONE-004, TONE-005, TONE-006] Tone generator UI with 12 chromatic tones

import { useState, useEffect, useRef } from 'react';
import { ToneGenerator as ToneGeneratorClass } from '../audio/toneGenerator';

type ToneNote = 'C4' | 'C#4' | 'D4' | 'D#4' | 'E4' | 'F4' | 'F#4' | 'G4' | 'G#4' | 'A4' | 'A#4' | 'B4';

interface ToneButton {
  label: string;
  note: ToneNote;
  isBlackKey: boolean;
}

const TONES: ToneButton[] = [
  { label: 'C', note: 'C4', isBlackKey: false },
  { label: 'C#', note: 'C#4', isBlackKey: true },
  { label: 'D', note: 'D4', isBlackKey: false },
  { label: 'D#', note: 'D#4', isBlackKey: true },
  { label: 'E', note: 'E4', isBlackKey: false },
  { label: 'F', note: 'F4', isBlackKey: false },
  { label: 'F#', note: 'F#4', isBlackKey: true },
  { label: 'G', note: 'G4', isBlackKey: false },
  { label: 'G#', note: 'G#4', isBlackKey: true },
  { label: 'A', note: 'A4', isBlackKey: false },
  { label: 'A#', note: 'A#4', isBlackKey: true },
  { label: 'B', note: 'B4', isBlackKey: false },
];

export function ToneGenerator() {
  const [activeTone, setActiveTone] = useState<ToneNote | null>(null);

  const toneGeneratorRef = useRef<ToneGeneratorClass | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Initialize tone generator on mount
   * [EARS: TONE-003] Set up tone generator
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    toneGeneratorRef.current = new ToneGeneratorClass(audioContextRef.current);

    // Cleanup on unmount
    return () => {
      if (toneGeneratorRef.current) {
        toneGeneratorRef.current.stopTone();
        toneGeneratorRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Handle tone button click
   * [EARS: TONE-004] Play tone on button press
   * [EARS: TONE-005] Stop tone on second click or when different button pressed
   */
  const handleToneClick = (note: ToneNote) => {
    if (!toneGeneratorRef.current) return;

    if (activeTone === note) {
      // Same button clicked - stop tone
      toneGeneratorRef.current.stopTone();
      setActiveTone(null);
    } else {
      // Different button clicked - stop previous and play new
      if (activeTone) {
        toneGeneratorRef.current.stopTone();
      }
      toneGeneratorRef.current.playTone(note);
      setActiveTone(note);
    }
  };

  return (
    <div
      className="tone-generator"
      style={{
        padding: '1rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '0.9rem' }}>
        Reference Tones
      </h3>

      {/* Tone Buttons */}
      {/* [EARS: TONE-003, TONE-006] 12 tone buttons in chromatic order */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {TONES.map((tone) => (
          <button
            key={tone.note}
            onClick={() => handleToneClick(tone.note)}
            className={activeTone === tone.note ? 'active' : ''}
            aria-label={tone.label}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: activeTone === tone.note
                ? (tone.isBlackKey ? '#ffeb3b' : '#4caf50')
                : (tone.isBlackKey ? '#333' : '#555'),
              color: activeTone === tone.note
                ? '#000'
                : '#fff',
              border: tone.isBlackKey ? '1px solid #666' : '1px solid #777',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              minWidth: '50px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (activeTone !== tone.note) {
                e.currentTarget.style.backgroundColor = tone.isBlackKey ? '#444' : '#666';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTone !== tone.note) {
                e.currentTarget.style.backgroundColor = tone.isBlackKey ? '#333' : '#555';
              }
            }}
          >
            {tone.label}
          </button>
        ))}
      </div>
    </div>
  );
}
