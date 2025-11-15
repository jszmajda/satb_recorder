# Rendering Performance & Timing-Critical UI Updates

This document describes lessons learned from implementing the metronome visual flasher and other timing-critical UI updates in this application.

## The Problem

When implementing UI elements that need to update at precise intervals (like a metronome flasher), React's normal rendering pipeline can introduce delays, batching, or dropped updates. This is especially problematic when:

1. **High-frequency updates**: Component needs to update multiple times per second
2. **Busy render thread**: Other components (like VU meter) are also updating frequently
3. **Precise timing required**: Visual feedback must be synchronized with audio/timing events
4. **Boolean toggles**: State alternates between two values (on/off, flashing/not-flashing)

## Why React State Doesn't Work

### Problem: React Batches State Updates

During heavy rendering work (e.g., recording session with VU meter updates), React batches multiple state updates together for performance. For a boolean toggle like `setIsFlashing(true/false)`, this means:

```typescript
// What you want:
setIsFlashing(true)  → render → setIsFlashing(false) → render → setIsFlashing(true) → render
// Every toggle is visible

// What actually happens:
setIsFlashing(true) → setIsFlashing(false) → setIsFlashing(true) → BATCH → render once
// Only final state is visible, intermediate states are lost
```

**Symptom**: Metronome appears to flash irregularly or not at all, with long pauses between visible flashes.

### Problem: React Re-renders Reset DOM Changes

Even direct DOM manipulation can fail if done incorrectly:

```typescript
// ❌ DOESN'T WORK: React re-renders wipe this out
const element = flashElementRef.current;
element.style.backgroundColor = '#4caf50';  // Set to green

// Later: React re-renders component
// JSX has: style={{ backgroundColor: '#444' }}
// React reapplies inline styles → green is overwritten
```

**Symptom**: Visual updates work initially but stop working as soon as the parent component re-renders.

## The Solution: Bypass React's Render Queue

For timing-critical UI updates, **bypass React state entirely** using data attributes and CSS.

### Implementation Pattern

**1. Use data attributes for state (not React state)**

```typescript
// ❌ Don't use React state
const [isFlashing, setIsFlashing] = useState(false);

// ✅ Use data attribute on DOM element
const element = flashElementRef.current;
element.dataset.flashing = 'true';  // React won't touch this
```

**2. Style with CSS based on data attribute**

```typescript
// ✅ CSS reacts to data attribute changes
<style>{`
  [data-testid="metronome-flash"] {
    background-color: #444;
  }
  [data-testid="metronome-flash"][data-flashing="true"] {
    background-color: #4caf50;
  }
`}</style>

<div
  ref={flashElementRef}
  data-testid="metronome-flash"
  data-flashing="false"  // Initial state
  style={{
    width: '28px',
    height: '28px',
    // NO backgroundColor here - let CSS handle it
  }}
/>
```

**3. Update via direct DOM manipulation**

```typescript
const handleVisualCallback = () => {
  const element = flashElementRef.current;
  if (!element) return;

  // Set to flashing
  element.dataset.flashing = 'true';

  // Clear after duration
  setTimeout(() => {
    element.dataset.flashing = 'false';
  }, FLASH_DURATION);
};
```

### Why This Works

1. **Data attributes survive React re-renders** - React doesn't manage or reset custom `data-*` attributes
2. **CSS updates instantly** - Browser applies CSS changes immediately without waiting for React
3. **No batching** - DOM manipulation happens synchronously, outside React's render queue
4. **Lightweight** - No virtual DOM diffing, no reconciliation, just direct DOM updates

## Timing Patterns

### Simple setInterval (Recommended for Visual Updates)

For visual feedback that doesn't need perfect audio sync:

```typescript
// Calculate interval from BPM
const intervalMs = 60000 / bpm;  // e.g., 500ms for 120 BPM

// Start interval
const intervalId = window.setInterval(() => {
  updateVisualFeedback();  // Direct DOM manipulation
}, intervalMs);

// Clean up
clearInterval(intervalId);
```

**Pros**: Simple, reliable, independent of audio/render thread
**Cons**: May drift slightly from audio over long periods
**Use for**: Metronome flasher, beat indicators, visual timers

### Tone.js Transport (For Audio-Synchronized Events)

For events that must be perfectly synchronized with audio:

```typescript
// Use Tone.Transport for scheduling
const scheduleId = Tone.getTransport().scheduleRepeat((time) => {
  // This fires on audio timeline
  playClickSound(time);  // Audio events
}, '4n');
```

**Pros**: Perfect audio synchronization
**Cons**: Not reliable for visual updates (callbacks can be dropped)
**Use for**: Audio click tracks, audio cues, MIDI-style events

### Hybrid Approach (Current Implementation)

Use **both** systems independently:

```typescript
// Tone.Transport for audio (future audio click track)
Tone.getTransport().start();

// Separate setInterval for visual flasher
window.setInterval(() => {
  flashVisual();  // DOM manipulation
}, intervalMs);
```

**Pros**: Audio and visual both work reliably, easy to add audio later
**Cons**: Visual and audio may drift slightly (not noticeable in practice)

## VU Meter: A Different Pattern

The VU meter uses a continuous value (0-100) rather than a boolean toggle. This actually works fine with React state + setInterval because:

1. **Continuous values don't get "lost"** - Even if React batches updates, the final value is visible
2. **Visual smoothness** - Transitions between close values (45 → 50 → 55) appear smooth even if some are batched

```typescript
// ✅ This works fine for VU meter
vuIntervalRef.current = window.setInterval(() => {
  if (vuMeterRef.current) {
    setVuLevel(vuMeterRef.current.getVolume());  // Continuous 0-100 value
  }
}, 50);  // 20 updates/second
```

**Key difference**: Numeric state (0-100) vs Boolean toggle (on/off)

## When to Start Timing-Critical Updates

### ❌ Bad: Start After Async Initialization

```typescript
await recorderRef.current.startRecording(stream);  // Can take seconds
metronome.start();  // Delayed start - bad UX
```

**Problem**: User sees delay before visual feedback appears

### ✅ Good: Start Immediately in Synchronous Code

```typescript
const startCountdown = () => {
  // Start metronome immediately (synchronous)
  metronome.start();

  // Then handle async operations
  setTimeout(async () => {
    await startRecording();
  }, COUNTDOWN_DURATION);
};
```

**Benefit**: Immediate visual feedback, better UX

## Decision Tree: Choosing the Right Approach

```
Does the update need to happen at precise intervals?
│
├─ NO → Use normal React state
│        Example: Button clicks, form inputs, modal visibility
│
└─ YES → Is it a boolean toggle (on/off)?
         │
         ├─ YES → Use data attributes + CSS + setInterval
         │         Example: Metronome flasher, beat indicators
         │
         └─ NO → Is it a continuous value (0-100)?
                  │
                  ├─ YES → React state + setInterval is fine
                  │         Example: VU meter, progress bars
                  │
                  └─ COMPLEX → Consider data attributes or Web Workers
                               Example: Waveform visualizers, spectrum analyzers
```

## Performance Considerations

### Update Frequencies

- **VU Meter**: 50ms intervals (20fps) - smooth visual feedback
- **Metronome**: BPM-based (500ms at 120 BPM) - precise timing
- **Waveform**: requestAnimationFrame (60fps) - smooth animations

### Avoid Over-Engineering

We tried several complex approaches that didn't work as well as the simple solution:

1. ❌ **AudioVisualizationLoop class** - Centralized RAF loop for all visuals
   - Overcomplicated, still had React batching issues

2. ❌ **Tone.Draw.schedule()** - Tone.js's official visual sync mechanism
   - Callbacks were dropped during heavy rendering

3. ✅ **Simple setInterval + data attributes** - Just works

**Lesson**: Start simple. Add complexity only if simple solutions fail.

## Testing Timing-Critical Components

When testing components that use data attributes:

```typescript
// ❌ Don't check React state (there isn't any)
expect(component).toHaveState({ isFlashing: true });

// ✅ Check data attributes
expect(element).toHaveAttribute('data-flashing', 'true');

// ✅ Can also check computed styles (if needed)
expect(element).toHaveStyle({ backgroundColor: 'rgb(76, 175, 80)' });
```

## Summary: Best Practices

1. **For timing-critical boolean toggles**: Use data attributes + CSS, not React state
2. **For continuous values**: React state is fine
3. **For visual timing**: Simple setInterval works reliably
4. **For audio timing**: Use Tone.Transport or Web Audio API scheduling
5. **Start immediately**: Don't wait for async operations before starting visual feedback
6. **Keep it simple**: Complex solutions often perform worse than simple ones
7. **Never use inline styles for values you'll change via DOM**: Let CSS handle styling

## Related Files

- `src/components/MetronomeControl.tsx` - Data attribute pattern implementation
- `src/audio/metronome.ts` - Separate visual/audio timing
- `src/components/RecordButton.tsx` - VU meter with React state + setInterval
- `src/audio/audioVisualizationLoop.ts` - Unused complex approach (kept for reference)

## Future Work

If we add more timing-critical visualizations:

1. **Waveform displays**: Consider Web Workers + OffscreenCanvas for complex rendering
2. **Spectrum analyzers**: Use Web Audio AnalyserNode + requestAnimationFrame
3. **Audio click track**: Use Tone.Transport for perfect audio sync
4. **Multiple simultaneous timers**: Consider shared timing coordinator (but keep it simple!)
