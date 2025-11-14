// [EARS: TONE-001 through TONE-005] Tone generator for 12-tone chromatic scale

import { Oscillator } from 'tone';

// Base frequency for C4 in Hz
const C4_FREQUENCY = 261.63;

// Note labels for chromatic scale
const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Validate semitone index is in valid range (0-11)
 */
function validateSemitone(semitone: number): void {
  if (semitone < 0 || semitone > 11) {
    throw new Error('Semitone index must be between 0 and 11');
  }
}

/**
 * Calculate frequency for a given semitone using equal temperament
 * [EARS: TONE-002] 12-tone chromatic scale from C4 (261.63 Hz) to B4 (493.88 Hz)
 *
 * @param semitone - Semitone index (0 = C4, 11 = B4)
 * @returns Frequency in Hz
 */
function calculateFrequency(semitone: number): number {
  // Equal temperament: f = f0 * 2^(n/12) where n is semitones from base
  return C4_FREQUENCY * Math.pow(2, semitone / 12);
}

/**
 * Tone generator for 12-tone chromatic scale pitch reference
 * [EARS: TONE-001, TONE-002, TONE-003, TONE-004, TONE-005]
 */
export class ToneGenerator {
  private oscillator: Oscillator;
  private playing: boolean = false;
  private currentNote: number | null = null;

  /**
   * Create a new ToneGenerator
   * [EARS: TONE-001] Initialize tone generator with sine wave oscillator
   */
  constructor() {
    this.oscillator = new Oscillator({
      frequency: C4_FREQUENCY,
      type: 'sine',
    }).toDestination();
  }

  /**
   * Check if tone is currently playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Get currently playing note (semitone index)
   */
  getCurrentNote(): number | null {
    return this.currentNote;
  }

  /**
   * Get frequency for a semitone index
   * [EARS: TONE-002] 12-tone chromatic scale frequency calculation
   *
   * @param semitone - Semitone index (0-11, can be float but will be floored)
   * @returns Frequency in Hz
   */
  getFrequency(semitone: number): number {
    const semitoneInt = Math.floor(semitone);
    validateSemitone(semitoneInt);
    return calculateFrequency(semitoneInt);
  }

  /**
   * Get note label for a semitone index
   * [EARS: TONE-003] Note labels for UI display
   *
   * @param semitone - Semitone index (0-11)
   * @returns Note label (e.g., 'C', 'C#', 'D', etc.)
   */
  getNoteLabel(semitone: number): string {
    const semitoneInt = Math.floor(semitone);
    validateSemitone(semitoneInt);
    return NOTE_LABELS[semitoneInt];
  }

  /**
   * Play tone at specified semitone
   * [EARS: TONE-004] Play tone on button press
   *
   * @param semitone - Semitone index (0-11)
   */
  play(semitone: number): void {
    const semitoneInt = Math.floor(semitone);
    validateSemitone(semitoneInt);

    // Stop current tone if playing
    if (this.playing) {
      this.oscillator.stop();
      this.playing = false;
    }

    // Set frequency and start oscillator
    const frequency = calculateFrequency(semitoneInt);
    this.oscillator.frequency.value = frequency;
    this.oscillator.start();

    this.playing = true;
    this.currentNote = semitoneInt;
  }

  /**
   * Stop currently playing tone
   * [EARS: TONE-005] Stop tone on release or second click
   */
  stop(): void {
    if (!this.playing) {
      return;
    }

    this.oscillator.stop();
    this.playing = false;
    this.currentNote = null;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.playing) {
      this.stop();
    }
    this.oscillator.dispose();
  }
}
