import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Metronome } from './metronome';
import * as Tone from 'tone';

describe('MET-001: Metronome initialization', () => {
  let metronome: Metronome;

  afterEach(() => {
    metronome?.dispose();
  });

  // ✅ Happy path
  test('initializes with default BPM of 120', () => {
    metronome = new Metronome();
    expect(metronome.getBpm()).toBe(120);
  });

  test('initializes in stopped state', () => {
    metronome = new Metronome();
    expect(metronome.isPlaying()).toBe(false);
  });

  test('accepts custom BPM on initialization', () => {
    metronome = new Metronome(140);
    expect(metronome.getBpm()).toBe(140);
  });

  // 🔥 Edge cases
  test('clamps BPM to minimum 40', () => {
    metronome = new Metronome(20);
    expect(metronome.getBpm()).toBe(40);
  });

  test('clamps BPM to maximum 240', () => {
    metronome = new Metronome(300);
    expect(metronome.getBpm()).toBe(240);
  });
});

describe('MET-002, MET-003, MET-004: BPM control', () => {
  let metronome: Metronome;

  beforeEach(() => {
    metronome = new Metronome();
  });

  afterEach(() => {
    metronome.dispose();
  });

  // ✅ Happy path
  test('sets BPM to specified value', () => {
    metronome.setBpm(150);
    expect(metronome.getBpm()).toBe(150);
  });

  test('increments BPM by 1', () => {
    metronome.setBpm(120);
    metronome.incrementBpm();
    expect(metronome.getBpm()).toBe(121);
  });

  test('decrements BPM by 1', () => {
    metronome.setBpm(120);
    metronome.decrementBpm();
    expect(metronome.getBpm()).toBe(119);
  });

  test('updates Tone.Transport BPM immediately', () => {
    metronome.setBpm(130);
    expect(Tone.getTransport().bpm.value).toBe(130);
  });

  test('updates BPM while playing', () => {
    metronome.start();
    metronome.setBpm(160);
    expect(metronome.getBpm()).toBe(160);
    expect(Tone.getTransport().bpm.value).toBe(160);
  });

  // 🔥 Edge cases
  test('clamps setBpm to minimum 40', () => {
    metronome.setBpm(10);
    expect(metronome.getBpm()).toBe(40);
  });

  test('clamps setBpm to maximum 240', () => {
    metronome.setBpm(500);
    expect(metronome.getBpm()).toBe(240);
  });

  test('does not decrement below 40', () => {
    metronome.setBpm(40);
    metronome.decrementBpm();
    expect(metronome.getBpm()).toBe(40);
  });

  test('does not increment above 240', () => {
    metronome.setBpm(240);
    metronome.incrementBpm();
    expect(metronome.getBpm()).toBe(240);
  });
});

describe('MET-005: Visual flash callback', () => {
  let metronome: Metronome;
  let flashCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    flashCallback = vi.fn();
    metronome = new Metronome();
  });

  afterEach(() => {
    metronome.dispose();
  });

  // ✅ Happy path
  test('registers visual callback', () => {
    metronome.setVisualCallback(flashCallback);
    expect(flashCallback).not.toHaveBeenCalled();
  });

  test('calls visual callback on each beat when playing', async () => {
    metronome.setVisualCallback(flashCallback);
    metronome.start();

    // Wait for a few beats (at 120 BPM, 1 beat = 500ms)
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(flashCallback).toHaveBeenCalled();
    expect(flashCallback.mock.calls.length).toBeGreaterThan(0);
  });

  test('does not call callback when stopped', async () => {
    metronome.setVisualCallback(flashCallback);
    metronome.start();
    await new Promise(resolve => setTimeout(resolve, 600));

    metronome.stop();
    flashCallback.mockClear();

    await new Promise(resolve => setTimeout(resolve, 600));
    expect(flashCallback).not.toHaveBeenCalled();
  });

  test('can update visual callback', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    metronome.setVisualCallback(callback1);
    metronome.start();
    await new Promise(resolve => setTimeout(resolve, 600));

    metronome.setVisualCallback(callback2);
    callback1.mockClear();
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  test('can remove visual callback', async () => {
    metronome.setVisualCallback(flashCallback);
    metronome.start();
    await new Promise(resolve => setTimeout(resolve, 600));

    metronome.setVisualCallback(null);
    flashCallback.mockClear();
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(flashCallback).not.toHaveBeenCalled();
  });
});

describe('MET-006, MET-007: Start, stop, and sync', () => {
  let metronome: Metronome;

  beforeEach(() => {
    metronome = new Metronome();
  });

  afterEach(() => {
    metronome.dispose();
  });

  // ✅ Happy path
  test('starts metronome', () => {
    metronome.start();
    expect(metronome.isPlaying()).toBe(true);
    expect(Tone.getTransport().state).toBe('started');
  });

  test('stops metronome', () => {
    metronome.start();
    metronome.stop();
    expect(metronome.isPlaying()).toBe(false);
    expect(Tone.getTransport().state).toBe('stopped');
  });

  test('can restart after stopping', () => {
    metronome.start();
    metronome.stop();
    metronome.start();
    expect(metronome.isPlaying()).toBe(true);
  });

  test('starting when already playing has no effect', () => {
    metronome.start();
    const firstState = metronome.isPlaying();
    metronome.start();
    expect(metronome.isPlaying()).toBe(firstState);
  });

  test('stopping when already stopped has no effect', () => {
    metronome.stop();
    expect(metronome.isPlaying()).toBe(false);
    metronome.stop();
    expect(metronome.isPlaying()).toBe(false);
  });

  // 🔥 Edge cases
  test('maintains BPM across start/stop cycles', () => {
    metronome.setBpm(145);
    metronome.start();
    metronome.stop();
    metronome.start();
    expect(metronome.getBpm()).toBe(145);
  });
});

describe('Metronome cleanup', () => {
  // ✅ Happy path
  test('disposes resources properly', () => {
    const metronome = new Metronome();
    metronome.start();
    metronome.dispose();

    expect(Tone.getTransport().state).toBe('stopped');
  });

  test('can dispose without starting', () => {
    const metronome = new Metronome();
    expect(() => metronome.dispose()).not.toThrow();
  });
});
