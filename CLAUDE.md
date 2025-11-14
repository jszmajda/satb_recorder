# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SATB Harmony Recorder** - A browser-based single-page application for recording multi-track vocal harmonies (Soprano, Alto, Tenor, Bass). Users can record multiple takes per voice part, overdub, mix with individual track controls, and export as WAV/MP3.

**Tech Stack:**
- Vite + React 18 + TypeScript
- Tone.js (audio framework)
- Zustand (state management)
- Dexie.js (IndexedDB wrapper)
- Tailwind CSS
- Vitest + React Testing Library

**Target Platform:** Modern Chromium-based browsers (Chrome, Edge, Brave)

## Critical Development Principles

### 1. Test-Driven Development (TDD) - MANDATORY

**ALL CODE MUST BE WRITTEN USING RED-GREEN-REFACTOR LOOP:**

1. **RED**: Write a failing test first
   - Write test for the requirement BEFORE writing implementation
   - Run test, verify it fails
   - Never skip this step

2. **GREEN**: Write minimal code to pass the test
   - Implement just enough to make test pass
   - Don't over-engineer
   - Run test, verify it passes

3. **REFACTOR**: Clean up code while keeping tests green
   - Improve code quality
   - Remove duplication
   - Ensure all tests still pass

**No exceptions.** If you're writing code without writing a test first, stop and write the test.

### 2. EARS Requirements Tracking - MANDATORY

**All features are defined as EARS requirements in `docs/DESIGN.md`.**

EARS format: `(SPEC-ID): (description)`

Example:
- **REC-001**: WHEN user clicks "Add Track" (+), the system shall request microphone permissions if not already granted.
- **MET-003**: The system shall allow BPM adjustment by typing a value directly into the input field.

**Current EARS spec count:** 82 requirements across 11 categories:
- Project Management (PROJ-001 to PROJ-009)
- Microphone & Input (MIC-001 to MIC-005)
- Recording (REC-001 to REC-011)
- Metronome (MET-001 to MET-007)
- Playback & Transport (PLAY-001 to PLAY-008)
- Seeking & Playhead (SEEK-001 to SEEK-004)
- Track Controls (TRACK-001 to TRACK-011)
- Voice Parts (VOICE-001 to VOICE-004)
- Visualization (VIS-001 to VIS-004)
- Export (EXP-001 to EXP-007)
- Overdub Control (OVER-001 to OVER-004)
- Tone Generator (TONE-001 to TONE-006)
- Error Handling (ERR-001 to ERR-003)

### 3. Code Comments for Requirement Traceability - MANDATORY

**Every piece of code implementing an EARS requirement MUST include a comment referencing the requirement ID.**

This ensures traceability from requirements → tests → implementation.

**Format:**

```typescript
// [EARS: SPEC-ID] Brief description if needed
```

**Examples:**

```typescript
// [EARS: REC-001] Request microphone permissions
async function requestMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (error) {
    // [EARS: ERR-001] Display error on permission denied
    showError('Microphone permission denied');
  }
}

// [EARS: MET-003] Allow BPM adjustment by typing
const handleBpmInput = (value: string) => {
  const bpm = parseInt(value, 10);
  if (bpm >= 40 && bpm <= 240) {
    // [EARS: MET-004] Update tempo immediately
    setMetronomeBpm(bpm);
  }
};

// [EARS: TRACK-007] Mute flag preserves volume/GainNode
const applyMute = (track: Track, gainNode: GainNode) => {
  // Don't modify gainNode.gain.value
  // Mute is handled in mixer logic, volume setting preserved
  if (track.muted) {
    // Track excluded from playback mix
    return null;
  }
  return gainNode;
};
```

**Why this matters:**
- Future developers can trace why code exists
- Makes it easy to verify all requirements are implemented
- Helps during debugging to understand intent
- Enables requirement impact analysis when changes are needed

## Project Structure

```
recorder/
├── docs/
│   ├── DESIGN.md              # Technical design + EARS requirements
│   └── IMPLEMENTATION.md      # Implementation plan with task checklist
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── MicrophoneSelector.tsx
│   │   ├── ToneGenerator.tsx
│   │   ├── MetronomeControl.tsx
│   │   ├── TransportControl.tsx
│   │   ├── VoicePartSection.tsx
│   │   ├── TrackRow.tsx
│   │   ├── Waveform.tsx
│   │   └── VUMeter.tsx
│   ├── audio/
│   │   ├── engine.ts          # Audio engine coordinator
│   │   ├── recorder.ts        # Recording logic
│   │   ├── mixer.ts           # Mixing & playback
│   │   ├── metronome.ts       # Metronome timing
│   │   ├── toneGenerator.ts   # Pitch reference tones
│   │   ├── visualizer.ts      # Waveform + VU meter
│   │   └── exporter.ts        # WAV/MP3 export
│   ├── store/
│   │   ├── useProjectStore.ts # Zustand store with auto-save
│   │   └── types.ts           # TypeScript interfaces
│   ├── db/
│   │   └── index.ts           # Dexie.js setup
│   ├── utils/
│   │   ├── audio.ts
│   │   ├── time.ts
│   │   └── constants.ts
│   └── tests/
│       ├── audio/
│       ├── components/
│       └── store/
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.js
└── CLAUDE.md                  # This file
```

## Development Workflow

### Starting a New Feature

1. **Read the EARS requirement(s)** from `docs/DESIGN.md`
2. **Check the implementation plan** in `docs/IMPLEMENTATION.md`
   - Find which task you're working on
   - Note which EARS requirements it covers
3. **Write the test FIRST** (Red)
   - Use `describe('SPEC-ID: behavior')` format
   - Example: `describe('REC-001: Request microphone permissions', ...)`
   - Include positive tests, negative tests, and edge cases
   - Test behavior/interfaces, not implementation details
4. **Run the test**, verify it fails
5. **Write minimal implementation** (Green)
   - Add EARS comment in code: `// [EARS: REC-001]`
   - Implement just enough to make tests pass
6. **Run the test**, verify it passes
7. **Refactor** if needed, keeping tests green
8. **✅ CRITICAL: Update checklist** in `docs/IMPLEMENTATION.md`
   - Mark tasks as `[x]` when complete
   - Update EARS requirements checklist
   - This step is MANDATORY - don't skip it!

### Example TDD Session

```typescript
// 1. RED: Write failing test first
// src/tests/audio/recorder.test.ts
import { describe, test, expect, vi } from 'vitest';

// Use describe() with EARS ID to organize tests by requirement
describe('REC-001: Request microphone permissions', () => {
  // Positive test - happy path
  test('requests permission when starting recording', async () => {
    const mockGetUserMedia = vi.fn().mockResolvedValue({});
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    const recorder = new Recorder();
    await recorder.start();

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  // Negative test - permission denied
  test('throws error when permission denied', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    const recorder = new Recorder();

    await expect(recorder.start()).rejects.toThrow('Permission denied');
  });
});

// Run test → FAILS (Recorder.start() not implemented)

// 2. GREEN: Write minimal implementation
// src/audio/recorder.ts
export class Recorder {
  // [EARS: REC-001] Request microphone permissions
  async start() {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

// Run test → PASSES

// 3. REFACTOR: Improve if needed
export class Recorder {
  private stream: MediaStream | null = null;

  // [EARS: REC-001] Request microphone permissions
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      // [EARS: ERR-001] Handle permission denied
      throw new Error('Microphone permission denied');
    }
  }
}

// Run test → STILL PASSES
```

## Testing Strategy

### Philosophy: Outside-In, Behavior-Driven Testing

**CRITICAL:** We test **behavior and interfaces**, NOT implementation details.

**Outside-In Approach:**
- Start with the public interface (what users/other modules interact with)
- Test the contract, not the internals
- Implementation can change as long as behavior stays correct
- Focus on "what" the system does, not "how" it does it

**When to test internals:**
- Complex algorithms with tricky edge cases
- Critical business logic that needs verification
- Paths that are hard to reach from the public interface

### Test Organization & Naming

**Use `describe()` blocks organized by EARS requirement:**

```typescript
import { describe, test, expect } from 'vitest';

// Good: Test behavior tied to EARS spec
describe('REC-001: Request microphone permissions', () => {
  test('requests permission when starting recording', async () => {
    // Test the behavior from outside
  });

  test('throws error when permission denied', async () => {
    // Negative test - expected failure case
  });

  test('reuses existing permission without re-requesting', async () => {
    // Edge case test
  });
});

describe('TRACK-007: Mute flag preserves volume', () => {
  test('muted track retains volume setting', () => {
    // Test observable behavior
  });

  test('unmuting track restores original volume', () => {
    // Test the contract
  });

  test('volume can be adjusted while track is muted', () => {
    // Edge case
  });
});

// Bad: Testing implementation details
describe('Recorder internal state', () => {
  test('sets _isRecording flag to true', () => {
    // ❌ Testing internal state
  });
});
```

### Include Negative Tests & Edge Cases

**Think creatively about what could go wrong:**

```typescript
describe('MET-003: BPM adjustment via direct input', () => {
  // Positive test
  test('accepts valid BPM value', () => { ... });

  // Negative tests
  test('rejects BPM below 40', () => { ... });
  test('rejects BPM above 240', () => { ... });
  test('rejects non-numeric input', () => { ... });
  test('rejects negative numbers', () => { ... });
  test('rejects floating point numbers', () => { ... });

  // Edge cases
  test('handles empty input gracefully', () => { ... });
  test('trims whitespace from input', () => { ... });
  test('handles very large numbers', () => { ... });
});
```

**Categories of tests to consider:**
- ✅ **Happy path** - Expected usage
- ⚠️ **Sad path** - Expected errors (permission denied, network failure)
- 🔥 **Edge cases** - Boundary conditions (empty arrays, max values, null/undefined)
- 🐛 **Regression** - Bugs that were fixed (prevent them from coming back)

### Test Organization by Layer

**Unit Tests:**
- `src/tests/audio/` - Audio engine modules (test public APIs)
- `src/tests/store/` - Zustand store (test state transitions)
- `src/tests/utils/` - Utility functions (test pure functions)

**Component Tests:**
- `src/tests/components/` - React components (test user interactions)
- Test what users see and do, not React internals
- Use `screen.getByRole()`, `screen.getByLabelText()` (accessible queries)
- Avoid `screen.getByTestId()` unless necessary

**Integration Tests:**
- `src/tests/integration/` - Full workflows
- Test multiple systems working together
- Examples: record → playback → export, save → load project

### Mocking Strategy

Mock at the **boundaries** of our system:

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  // Mock external APIs (Web Audio, MediaDevices, IndexedDB)
  // These are boundaries we don't control
  global.AudioContext = vi.fn().mockImplementation(() => ({ ... }));
  navigator.mediaDevices = { ... };
});
```

**What to mock:**
- ✅ External APIs (Web Audio, DOM APIs, IndexedDB)
- ✅ Network requests
- ✅ Timers (for metronome, animations)
- ✅ File system operations

**What NOT to mock:**
- ❌ Your own modules (test them for real)
- ❌ Simple utilities (test actual behavior)
- ❌ Pure functions (they're easy to test directly)

## Common Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests (watch mode)
npm run test

# Run tests (single run)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint
npm run lint
```

## Key Implementation Notes

### Auto-Save Pattern

```typescript
// [EARS: PROJ-005] Auto-save on every change
const useProjectStore = create<ProjectStore>()(
  // Middleware to auto-save on state changes
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'project-storage',
      storage: createDexieStorage(), // Custom storage using Dexie.js
      onRehydrateStorage: () => (state) => {
        console.log('Project loaded from IndexedDB');
      },
    }
  )
);
```

### Mute as Boolean Flag (NOT GainNode modification)

```typescript
// [EARS: TRACK-007] Mute flag does NOT modify GainNode
interface Track {
  volume: number;      // 0-100, persists independently
  muted: boolean;      // Boolean flag for mute state
  gainNode?: GainNode; // Gain reflects volume, not mute
}

// CORRECT: Mute handled in mixer logic
const getMixerTracks = (tracks: Track[]) => {
  // [EARS: PLAY-006] Exclude muted tracks from mix
  return tracks.filter(t => !t.muted);
};

// INCORRECT: Don't do this
const muteTrack = (track: Track) => {
  track.gainNode.gain.value = 0; // ❌ Wrong! Loses volume setting
};
```

### Overdub Toggle

```typescript
// [EARS: OVER-002, OVER-003] Overdub controls playback during recording
const startRecording = (project: Project) => {
  if (!project.overdubEnabled) {
    // [EARS: OVER-002] Mute all tracks when overdub disabled
    muteAllTracksTemporarily();
  } else {
    // [EARS: OVER-003] Respect solo/mute settings when overdub enabled
    // Playback continues with current solo/mute state
  }

  startMediaRecorder();
};
```

### Tone Generator Frequencies

```typescript
// [EARS: TONE-002] 12 chromatic tones from C4 to B4, includes A440
const TONE_FREQUENCIES = {
  'C': 261.63,   // C4
  'C#': 277.18,  // C#4
  'D': 293.66,   // D4
  'D#': 311.13,  // D#4
  'E': 329.63,   // E4
  'F': 349.23,   // F4
  'F#': 369.99,  // F#4
  'G': 392.00,   // G4
  'G#': 415.30,  // G#4
  'A': 440.00,   // A4 (A440 reference)
  'A#': 466.16,  // A#4
  'B': 493.88,   // B4
};
```

## Documentation

### README.md (User-Facing)
- Setup instructions
- Basic usage guide
- Keyboard shortcuts
- Browser compatibility

### docs/DESIGN.md (Technical)
- Architecture overview
- Technology choices
- **EARS requirements** (source of truth)
- Data models
- UI/UX specs

### docs/IMPLEMENTATION.md (Development)
- Phase-by-phase implementation plan
- Task checklist with EARS references
- Progress tracking

## Getting Help

If you encounter issues:

1. **Check EARS requirements** in `docs/DESIGN.md` for clarification
2. **Review implementation plan** in `docs/IMPLEMENTATION.md`
3. **Verify tests are passing** with `npm run test`
4. **Check browser console** for runtime errors (Web Audio API, IndexedDB)
5. **Verify Web Audio API support** in Chromium-based browsers

## Important Reminders

### DO:
✅ Write tests FIRST (red-green-refactor)
✅ Use `describe('SPEC-ID: behavior')` for test organization
✅ Test behavior/interfaces, not implementation details
✅ Include positive tests, negative tests, AND edge cases
✅ Add `// [EARS: ID]` comments in implementation code
✅ Run tests frequently during development
✅ Keep tests green while refactoring
✅ **Update `docs/IMPLEMENTATION.md` as you complete tasks** (MANDATORY)
✅ Use TypeScript strictly (no `any` types without good reason)
✅ Store audio as uncompressed WAV in IndexedDB
✅ Auto-save on every state change

### DON'T:
❌ Write implementation code without a test first
❌ Test internal implementation details (private methods, internal state)
❌ Forget negative tests and edge cases
❌ Skip updating `docs/IMPLEMENTATION.md` checklist
❌ Modify GainNode for mute (use boolean flag)
❌ Skip EARS comments in code
❌ Commit code with failing tests
❌ Use `any` type without justification
❌ Ignore browser compatibility (target: modern Chromium)
❌ Forget to handle errors (mic permission, storage quota, encoding failures)

## Code Style

- **TypeScript:** Strict mode enabled
- **React:** Functional components with hooks
- **State:** Zustand for global state, local state for component-specific
- **Styling:** Tailwind CSS utility classes
- **Formatting:** Prettier (if configured) or consistent manual formatting
- **Naming:**
  - Components: PascalCase (`TopBar`, `TrackRow`)
  - Files: Match component name (`TopBar.tsx`)
  - Hooks: camelCase with `use` prefix (`useProjectStore`)
  - Functions: camelCase (`handleBpmChange`)
  - Constants: UPPER_SNAKE_CASE (`TONE_FREQUENCIES`)

## Example: Complete Feature Implementation

Here's a full example implementing **MET-003: BPM adjustment via direct input**

```typescript
// 1. RED: Write test first
// src/tests/components/MetronomeControl.test.tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetronomeControl } from '@/components/MetronomeControl';

// Use describe() with EARS ID
describe('MET-003: BPM adjustment via direct input', () => {
  // Positive test - happy path
  test('accepts valid BPM value', () => {
    const handleBpmChange = vi.fn();
    render(<MetronomeControl bpm={120} onBpmChange={handleBpmChange} />);

    const input = screen.getByLabelText(/bpm/i);
    fireEvent.change(input, { target: { value: '140' } });
    fireEvent.blur(input);

    // [EARS: MET-004] Update tempo immediately on change
    expect(handleBpmChange).toHaveBeenCalledWith(140);
  });

  // Negative test - invalid input
  test('rejects BPM below minimum (40)', () => {
    const handleBpmChange = vi.fn();
    render(<MetronomeControl bpm={120} onBpmChange={handleBpmChange} />);

    const input = screen.getByLabelText(/bpm/i);
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.blur(input);

    // Should not call handler with invalid value
    expect(handleBpmChange).not.toHaveBeenCalled();
    // Should show original value
    expect(input).toHaveValue('120');
  });

  // Edge case - empty input
  test('handles empty input gracefully', () => {
    const handleBpmChange = vi.fn();
    render(<MetronomeControl bpm={120} onBpmChange={handleBpmChange} />);

    const input = screen.getByLabelText(/bpm/i);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(handleBpmChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('120');
  });
});

// Run test → FAILS

// 2. GREEN: Minimal implementation
// src/components/MetronomeControl.tsx
interface MetronomeControlProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export const MetronomeControl: React.FC<MetronomeControlProps> = ({
  bpm,
  onBpmChange,
}) => {
  // [EARS: MET-003] Allow BPM adjustment by typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      // [EARS: MET-004] Update tempo immediately
      onBpmChange(value);
    }
  };

  return (
    <div>
      <label htmlFor="bpm-input">BPM</label>
      <input
        id="bpm-input"
        type="number"
        value={bpm}
        onChange={handleInputChange}
        onBlur={handleInputChange}
      />
    </div>
  );
};

// Run test → PASSES

// 3. REFACTOR: Add validation, styling
export const MetronomeControl: React.FC<MetronomeControlProps> = ({
  bpm,
  onBpmChange,
}) => {
  const [inputValue, setInputValue] = useState(bpm.toString());

  // [EARS: MET-003] Allow BPM adjustment by typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    // Validate range (40-240 BPM)
    if (!isNaN(value) && value >= 40 && value <= 240) {
      // [EARS: MET-004] Update tempo immediately
      onBpmChange(value);
    } else {
      // Reset to current valid BPM
      setInputValue(bpm.toString());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bpm-input" className="text-sm font-medium">
        BPM
      </label>
      <input
        id="bpm-input"
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="w-16 px-2 py-1 border rounded"
        min={40}
        max={240}
      />
    </div>
  );
};

// Run test → STILL PASSES
```

## Final Checklist Before Committing

Before committing any code:

**Testing:**
- [ ] All tests passing (`bun run test:run`)
- [ ] Tests use `describe('SPEC-ID: behavior')` format
- [ ] Tests cover positive cases, negative cases, AND edge cases
- [ ] Tests validate behavior/interfaces, not implementation details
- [ ] TypeScript compiles without errors (`bun run type-check`)
- [ ] ESLint passes with no errors (`bun run lint`)

**Code Quality:**
- [ ] EARS comments added to implementation code (`// [EARS: SPEC-ID]`)
- [ ] Code follows red-green-refactor loop
- [ ] No `console.log` debugging statements left in code
- [ ] Component props have TypeScript interfaces
- [ ] Error handling implemented where needed (ERR-001, ERR-002, ERR-003)

**Documentation:**
- [ ] **✅ MANDATORY: `docs/IMPLEMENTATION.md` updated**
  - Tasks marked `[x]` when complete
  - EARS requirements checked off
  - Progress tracking section updated
  - **This is NOT optional - always do this!**

---

**Remember:**
- 🧪 Test first, EARS always, trace everything
- 🎯 Test behavior, not implementation
- 📋 **Always update IMPLEMENTATION.md**
- 🔄 Red-Green-Refactor loop is mandatory

**Document Version:** 2.0
**Last Updated:** 2025-11-13
**Author:** Claude Code + Jess
