// [EARS: MET-001 through MET-007] Metronome module using Tone.js Transport

import * as Tone from 'tone';

const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 120;

/**
 * Clamp BPM to valid range
 */
function clampBpm(bpm: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
}

/**
 * Metronome for precise timing using Tone.js Transport
 * [EARS: MET-001, MET-002, MET-003, MET-004, MET-005, MET-006, MET-007]
 */
export class Metronome {
  private bpm: number;
  private playing: boolean = false;
  private visualCallback: (() => void) | null = null;
  private scheduleId: number | null = null;

  /**
   * Create a new Metronome
   * [EARS: MET-001] Initialize metronome with default or custom BPM
   *
   * @param initialBpm - Initial BPM (default 120, clamped to 40-240)
   */
  constructor(initialBpm: number = DEFAULT_BPM) {
    this.bpm = clampBpm(initialBpm);
    Tone.getTransport().bpm.value = this.bpm;
  }

  /**
   * Get current BPM
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Set BPM
   * [EARS: MET-004] Update metronome tempo immediately
   *
   * @param bpm - BPM value (clamped to 40-240)
   */
  setBpm(bpm: number): void {
    this.bpm = clampBpm(bpm);
    Tone.getTransport().bpm.value = this.bpm;
  }

  /**
   * Increment BPM by 1
   * [EARS: MET-002] BPM adjustment via increment button
   */
  incrementBpm(): void {
    this.setBpm(this.bpm + 1);
  }

  /**
   * Decrement BPM by 1
   * [EARS: MET-002] BPM adjustment via decrement button
   */
  decrementBpm(): void {
    this.setBpm(this.bpm - 1);
  }

  /**
   * Check if metronome is playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Set visual callback for beat flash
   * [EARS: MET-005] Visual flash callback system
   *
   * @param callback - Function to call on each beat, or null to remove
   */
  setVisualCallback(callback: (() => void) | null): void {
    this.visualCallback = callback;
  }

  /**
   * Start metronome
   * [EARS: MET-006, MET-007] Sync during recording and playback
   */
  start(): void {
    if (this.playing) {
      return;
    }

    this.playing = true;

    // Schedule the visual callback to fire on every quarter note
    this.scheduleId = Tone.getTransport().scheduleRepeat((time) => {
      if (this.visualCallback) {
        // Use Draw to sync with animation frame
        Tone.Draw.schedule(() => {
          this.visualCallback?.();
        }, time);
      }
    }, '4n'); // Every quarter note (one beat)

    Tone.getTransport().start();
  }

  /**
   * Stop metronome
   */
  stop(): void {
    if (!this.playing) {
      return;
    }

    this.playing = false;

    if (this.scheduleId !== null) {
      Tone.getTransport().clear(this.scheduleId);
      this.scheduleId = null;
    }

    Tone.getTransport().stop();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
    this.visualCallback = null;
  }
}
