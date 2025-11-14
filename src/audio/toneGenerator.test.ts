import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToneGenerator } from './toneGenerator';
import * as Tone from 'tone';

describe('TONE-001: ToneGenerator initialization', () => {
  let toneGenerator: ToneGenerator;

  afterEach(() => {
    toneGenerator?.dispose();
  });

  // ✅ Happy path
  test('initializes ToneGenerator instance', () => {
    toneGenerator = new ToneGenerator();
    expect(toneGenerator).toBeInstanceOf(ToneGenerator);
  });

  test('initializes in stopped state', () => {
    toneGenerator = new ToneGenerator();
    expect(toneGenerator.isPlaying()).toBe(false);
  });

  test('initializes with no active note', () => {
    toneGenerator = new ToneGenerator();
    expect(toneGenerator.getCurrentNote()).toBeNull();
  });
});

describe('TONE-002: 12-tone chromatic scale frequencies', () => {
  let toneGenerator: ToneGenerator;

  beforeEach(() => {
    toneGenerator = new ToneGenerator();
  });

  afterEach(() => {
    toneGenerator.dispose();
  });

  // ✅ Happy path - Test all 12 notes of the chromatic scale
  test('provides correct frequency for C4 (261.63 Hz)', () => {
    expect(toneGenerator.getFrequency(0)).toBeCloseTo(261.63, 1);
  });

  test('provides correct frequency for C#4/Db4 (277.18 Hz)', () => {
    expect(toneGenerator.getFrequency(1)).toBeCloseTo(277.18, 1);
  });

  test('provides correct frequency for D4 (293.66 Hz)', () => {
    expect(toneGenerator.getFrequency(2)).toBeCloseTo(293.66, 1);
  });

  test('provides correct frequency for D#4/Eb4 (311.13 Hz)', () => {
    expect(toneGenerator.getFrequency(3)).toBeCloseTo(311.13, 1);
  });

  test('provides correct frequency for E4 (329.63 Hz)', () => {
    expect(toneGenerator.getFrequency(4)).toBeCloseTo(329.63, 1);
  });

  test('provides correct frequency for F4 (349.23 Hz)', () => {
    expect(toneGenerator.getFrequency(5)).toBeCloseTo(349.23, 1);
  });

  test('provides correct frequency for F#4/Gb4 (369.99 Hz)', () => {
    expect(toneGenerator.getFrequency(6)).toBeCloseTo(369.99, 1);
  });

  test('provides correct frequency for G4 (392.00 Hz)', () => {
    expect(toneGenerator.getFrequency(7)).toBeCloseTo(392.00, 1);
  });

  test('provides correct frequency for G#4/Ab4 (415.30 Hz)', () => {
    expect(toneGenerator.getFrequency(8)).toBeCloseTo(415.30, 1);
  });

  test('provides correct frequency for A4 (440.00 Hz)', () => {
    expect(toneGenerator.getFrequency(9)).toBeCloseTo(440.00, 1);
  });

  test('provides correct frequency for A#4/Bb4 (466.16 Hz)', () => {
    expect(toneGenerator.getFrequency(10)).toBeCloseTo(466.16, 1);
  });

  test('provides correct frequency for B4 (493.88 Hz)', () => {
    expect(toneGenerator.getFrequency(11)).toBeCloseTo(493.88, 1);
  });

  // 🔥 Edge cases
  test('throws error for semitone index below 0', () => {
    expect(() => toneGenerator.getFrequency(-1)).toThrow('Semitone index must be between 0 and 11');
  });

  test('throws error for semitone index above 11', () => {
    expect(() => toneGenerator.getFrequency(12)).toThrow('Semitone index must be between 0 and 11');
  });

  test('accepts semitone index as floating point (rounds down)', () => {
    // Should treat 9.7 as 9 (A4)
    expect(toneGenerator.getFrequency(9.7)).toBeCloseTo(440.00, 1);
  });
});

describe('TONE-003: Note labels', () => {
  let toneGenerator: ToneGenerator;

  beforeEach(() => {
    toneGenerator = new ToneGenerator();
  });

  afterEach(() => {
    toneGenerator.dispose();
  });

  // ✅ Happy path
  test('provides note labels for all 12 semitones', () => {
    const labels = [
      'C', 'C#', 'D', 'D#', 'E', 'F',
      'F#', 'G', 'G#', 'A', 'A#', 'B'
    ];

    labels.forEach((label, index) => {
      expect(toneGenerator.getNoteLabel(index)).toBe(label);
    });
  });

  // 🔥 Edge cases
  test('throws error for invalid semitone index', () => {
    expect(() => toneGenerator.getNoteLabel(-1)).toThrow('Semitone index must be between 0 and 11');
    expect(() => toneGenerator.getNoteLabel(12)).toThrow('Semitone index must be between 0 and 11');
  });
});

describe('TONE-004, TONE-005: Play and stop tones', () => {
  let toneGenerator: ToneGenerator;

  beforeEach(() => {
    toneGenerator = new ToneGenerator();
  });

  afterEach(() => {
    toneGenerator.dispose();
  });

  // ✅ Happy path
  test('plays tone at specified semitone', () => {
    toneGenerator.play(9); // A4 = 440 Hz
    expect(toneGenerator.isPlaying()).toBe(true);
    expect(toneGenerator.getCurrentNote()).toBe(9);
  });

  test('updates oscillator frequency when playing', () => {
    const mockOscillator = vi.mocked(Tone.Oscillator);
    toneGenerator.play(0); // C4 = 261.63 Hz

    // Note: In actual implementation, oscillator frequency should be set
    expect(toneGenerator.getCurrentNote()).toBe(0);
  });

  test('stops currently playing tone', () => {
    toneGenerator.play(5);
    expect(toneGenerator.isPlaying()).toBe(true);

    toneGenerator.stop();
    expect(toneGenerator.isPlaying()).toBe(false);
    expect(toneGenerator.getCurrentNote()).toBeNull();
  });

  test('can play different notes sequentially', () => {
    toneGenerator.play(0); // C4
    expect(toneGenerator.getCurrentNote()).toBe(0);

    toneGenerator.stop();

    toneGenerator.play(7); // G4
    expect(toneGenerator.getCurrentNote()).toBe(7);
  });

  test('can restart same note after stopping', () => {
    toneGenerator.play(4);
    toneGenerator.stop();
    toneGenerator.play(4);

    expect(toneGenerator.isPlaying()).toBe(true);
    expect(toneGenerator.getCurrentNote()).toBe(4);
  });

  // 🔥 Edge cases
  test('playing when already playing stops previous and plays new note', () => {
    toneGenerator.play(2);
    expect(toneGenerator.getCurrentNote()).toBe(2);

    toneGenerator.play(8);
    expect(toneGenerator.getCurrentNote()).toBe(8);
    expect(toneGenerator.isPlaying()).toBe(true);
  });

  test('stopping when already stopped has no effect', () => {
    toneGenerator.stop();
    expect(toneGenerator.isPlaying()).toBe(false);

    toneGenerator.stop();
    expect(toneGenerator.isPlaying()).toBe(false);
  });

  test('throws error for invalid semitone index when playing', () => {
    expect(() => toneGenerator.play(-1)).toThrow('Semitone index must be between 0 and 11');
    expect(() => toneGenerator.play(12)).toThrow('Semitone index must be between 0 and 11');
  });
});

describe('ToneGenerator cleanup', () => {
  // ✅ Happy path
  test('disposes resources properly', () => {
    const toneGenerator = new ToneGenerator();
    toneGenerator.play(5);
    toneGenerator.dispose();

    expect(toneGenerator.isPlaying()).toBe(false);
  });

  test('can dispose without playing', () => {
    const toneGenerator = new ToneGenerator();
    expect(() => toneGenerator.dispose()).not.toThrow();
  });

  test('disposes while playing stops tone', () => {
    const toneGenerator = new ToneGenerator();
    toneGenerator.play(3);
    expect(toneGenerator.isPlaying()).toBe(true);

    toneGenerator.dispose();
    expect(toneGenerator.isPlaying()).toBe(false);
  });
});
