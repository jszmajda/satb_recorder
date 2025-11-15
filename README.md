# SATB - Multi-Track Vocal Harmony Recorder

A browser-based multi-track audio recorder for recording vocal harmonies (Soprano, Alto, Tenor, Bass). This project demonstrates how to build production-quality software using AI-assisted development with rigorous TDD practices.

**Live Demo:** `bun run dev` → http://localhost:5173/

**What it does:** Record yourself singing 4-part harmonies, overdub multiple takes per voice part, mix tracks with individual volume/mute/solo controls, and export to WAV/MP3.

**Why it's interesting:** This entire application was built using Claude Code with a structured methodology that others can replicate. Every feature was developed using test-driven development (TDD) with comprehensive EARS requirements specifications.

---

## How We Built This: AI-Assisted TDD Methodology

This project showcases a **repeatable methodology** for building production-quality software with AI assistance. The approach emphasizes rigorous requirements, test-driven development, and phased implementation.

### 1. Vision → Questions → Alignment

**Start with clear vision, then request planning:**

> "Hey! I had an idea for a webapp. I love to sing, and my range is pretty broad, so I'd like to record myself singing 4 part harmony (SATB)..."

After sharing the vision, explicitly ask for planning:

> "Let's make a plan and, when we're aligned, write a design doc for the project first that details our choices."

**What happened:**
- AI asked clarifying questions about workflows, technical constraints, UX details
- We aligned on specifics through Q&A before writing any code
- This upfront investment prevented costly rewrites later

### 2. Mandate TDD and Structured Requirements

**Explicitly require TDD from the start:**

> "Let's also be sure to indicate that we need to build this using TDD with a red-green-refactor loop!"

**Request EARS format for requirements:**

> "Does that all make sense? If so, let's adjust this design file, move it to docs/, then add EARS-format specs (per https://alistairmavin.com/ears/, e.g. "(spec-id): (description)" one per line), move out the implementation plan into its own file and add a checklist that refers back to the EARS specs."

**What happened:**
- AI created [docs/DESIGN.md](docs/DESIGN.md) with EARS requirements (PROJ-001, MIC-001, REC-001, etc.)
- AI created [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) with phased tasks mapped to requirements
- Every requirement became a testable specification
- Each phase tracked test coverage and completion

**The documents include:**

**DESIGN.md:**
- Architecture overview with technology rationale
- EARS requirements specifications (90+ requirements)
- Data models and interfaces
- User workflows

**IMPLEMENTATION.md:**
- Phased development approach (7 phases)
- Task breakdown with requirement traceability
- Test coverage metrics per phase
- Completion checklists

**For larger projects:** Split design/implementation docs per component instead of unified files.

### 3. EARS Requirements Format

Every feature uses the EARS format for clarity and testability:

```
[ID]: WHEN/IF [condition], THEN [system behavior]
```

Examples:
- `PROJ-001`: WHEN user clicks "New Project", the system shall prompt for a project name
- `REC-002`: WHEN user starts recording, the system shall display a countdown (3-2-1)
- `TRACK-006`: WHEN user clicks Mute on a track, the system shall set that track's mute boolean to true

**Benefits:**
- Unambiguous requirements
- Direct mapping to test cases
- Easy traceability throughout development

### 4. Test-Driven Development (TDD) - Red-Green-Refactor

**Every feature follows this loop:**

1. **Red**: Write failing test for the requirement
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code quality while tests stay green

**Example from our process:**

```typescript
// 1. RED: Write failing test for MIC-001
test('enumerates microphone devices on initialization', async () => {
  const recorder = new Recorder();
  await recorder.enumerateDevices();
  expect(recorder.getAvailableDevices()).toHaveLength(3);
});

// 2. GREEN: Implement just enough to pass
async enumerateDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  this.devices = devices.filter(d => d.kind === 'audioinput');
}

// 3. REFACTOR: Clean up, add error handling, improve structure
```

**Result:** 685 tests covering all functionality, all green.

### 5. Phased Development

Build in logical order:
1. **Project setup** - Testing infrastructure, mocks, build tools
2. **Data layer** - IndexedDB + Zustand state management
3. **Audio engine** - Recording, playback, mixing, export modules
4. **UI components** - React components with integration tests
5. **Polish** - Keyboard shortcuts, error handling, edge cases

**Each phase:**
- Lists specific tasks with EARS requirement IDs
- Tracks test coverage metrics
- Marks completion with checkboxes
- Notes any deferred items (e.g., "requires UI integration")

### 6. Requirement Traceability

Every phase documents:
- Which EARS requirements it implements
- How many tests cover those requirements
- Test file locations

Example from [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md):
```markdown
### 3.3 Recorder Module - Device Management ✅
- [x] Write tests for microphone enumeration (MIC-001)
- [x] Implement navigator.mediaDevices.enumerateDevices()
- [x] Write tests for device selection (MIC-002, MIC-003)
...

**EARS Requirements:** MIC-001, MIC-002, MIC-003, MIC-004
**Test Coverage:** 25 tests in src/audio/recorder.test.ts
**Completed:** 2025-11-14
```

### 7. Provide Detailed, Structured Feedback

**After reviewing design docs, provide numbered feedback:**

> "Great! some feedback:
>
> 1. Let's note that I might have multiple microphones connected, and need to be able to choose among them in the interface.
> 2. each (visible) sparkline should show a visual progression of the playhead...
> 3. bpm should be adjustable by typing a new value as well as clicking + or - buttons
> 4. count-in is brilliant, thank you for catching that!
> ...
> 10. to the open questions / enhancements - those future features are definitely not in scope for now..."

**Give specific technical direction when needed:**

> "Mute interface - instead of adjusting GainNode it should just set an override 'muted' boolean, that way we don't lose the Gain setting that I might have adjusted."

**What this achieves:**
- Clear, actionable feedback in numbered lists
- Technical specificity prevents misunderstandings
- Acknowledges good ideas ("brilliant, thank you!")
- Explicitly marks items out of scope
- AI can update docs systematically

### 8. Continuous Verification

Throughout development:
- Run tests frequently (`bun run test`)
- Type-check continuously (`bun run type-check`)
- Test in browser during UI phase
- Iterate based on real-world usage
- Provide feedback on what works and what doesn't

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) v1.2.18+
- Modern Chromium browser (Chrome, Edge, Brave)
- Microphone access

### Installation & Development

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:5173/)
bun run dev

# Run tests
bun run test

# Type check
bun run type-check

# Build for production
bun run build
```

---

## Key Features

**Recording:** Multi-track with overdub mode, device selection, VU meter, metronome (40-240 BPM), 12-tone pitch reference, 4-beat countdown

**Playback:** Waveform visualization, timeline seeking, individual track volume/mute/solo, anti-clipping master gain (1/√N scaling)

**Projects:** Auto-save to IndexedDB, persistence across sessions, single-level undo (Ctrl+Z)

**Export:** WAV (uncompressed) and MP3 (128kbps)

**Shortcuts:** Space (play/pause), Ctrl+Z (undo)

---

## Tech Stack

- React 18 + TypeScript + Vite
- Web Audio API (AudioWorklet, GainNodes, AnalyserNode)
- Tone.js for metronome timing
- Zustand for state management
- Dexie.js for IndexedDB
- Vitest + React Testing Library (685 tests)
- Bun for package management

## Applying This Methodology to Your Projects

Use these complete prompts as templates when working with AI:

### Phase 1: Share Vision and Request Planning

**Complete initial prompt:**
```
Hey! I had an idea for a webapp. I love to sing, and my range is pretty
broad, so I'd like to record myself singing 4 part harmony (SATB). I want
to be able to record multiple tracks for each voice, and then to multiplex
them all together to listen and re-record certain tracks, adjust the volume
of certain tracks relative to the others, and then eventually downmix the
tracks into a resulting compressed audio file. I think I can build all this
as a single page app that runs in the browser locally, although I might have
to use a local webserver to deal with some browser security issues?

[Include UI layout sketch or description]

What do you think? Is this doable with a local React app?
```

**After AI responds with questions, explicitly request planning:**
```
Great questions!

[Answer the clarifying questions]

Let's make a plan and, when we're aligned, write a design doc for the
project first that details our choices.
```

### Phase 2: Mandate TDD and Structure Requirements

**Require TDD explicitly:**
```
Let's also be sure to indicate that we need to build this using TDD with
a red-green-refactor loop!
```

**After reviewing initial design doc, request EARS format:**
```
Does that all make sense? If so, let's adjust this design file, move it to
docs/, then add EARS-format specs (per https://alistairmavin.com/ears/,
e.g. "(spec-id): (description)" one per line), move out the implementation
plan into its own file and add a checklist that refers back to the EARS
specs.
```

### Phase 3: Provide Detailed, Numbered Feedback

**Complete feedback format:**
```
Great! some feedback:

1. Let's note that I might have multiple microphones connected, and need
   to be able to choose among them in the interface.

2. each (visible) sparkline should show a visual progression of the
   playhead as well as the playhead moving. This doesn't have to be
   complex - whatever's simplest.

3. bpm should be adjustable by typing a new value as well as clicking
   + or - buttons

4. count-in is brilliant, thank you for catching that!

5. during recording, I should see a VU indicator showing microphone
   activity. We can just show that where the sparkline would be for
   the new track I'm recording.

6. the overdub record interface is odd.. I think it'd be easier to have
   a simple toggle switch somewhere in the interface for overdubbing or
   not. Default is not (and override-mutes all tracks during recording).
   If enabled, it respects the current mute/solo selections per track.

7. Mute interface - instead of adjusting GainNode it should just set an
   override 'muted' boolean, that way we don't lose the Gain setting that
   I might have adjusted.

8. seek - I should also be able to drag the playhead to a new position

9. let's actually adjust the new/save behavior - New should always prompt
   for a project name (which can show to the right of Export), then any
   changes are always saved immediately (and we can remove the need for
   any explicit save). We can add a "delete project" button to the right
   of the project name in that header bar.

10. to the open questions / enhancements - those future features are
    definitely not in scope for now. The wav storage is fine.. and we
    don't have to worry about browser compat - I'm happy to use the
    latest Chromium series browsers.

Does that all make sense? If so, let's adjust this design file...
```

### Phase 4: Execute Implementation with TDD
- Work through IMPLEMENTATION.md phases systematically
- For each feature: Write test (Red) → Write code (Green) → Refactor
- Check off tasks as completed
- Document test coverage metrics

### Phase 5: Iterate Based on Real Usage
```
[After testing in browser]

"oh interesting - I changed the BPM and the countdown is still going
at 120 :D Please make sure the countdown timing is sync'd to the
metronome timing"

"nice, also solo/mute don't seem to be working properly, and they
kind of interrupt playback also when I click them"

"As I layer in more tracks, the sum of the waveforms playing back
sometimes exceeds the max value of the output stream and causes
clipping. We probably need to do some kind of adjustment such that
the max of any summed waveform doesn't exceed the boundaries of the
output stream?"
```

**Key principles:**
- Be specific about technical implementation details
- Use numbered lists for multiple items
- Acknowledge good suggestions
- Clearly mark scope boundaries
- Report issues as you discover them during testing

**For larger projects:** Instead of single DESIGN.md and IMPLEMENTATION.md files, organize by component:
```
docs/
├── architecture/         # Overall system design
├── auth/
│   ├── design.md        # Authentication component design
│   └── implementation.md
├── payments/
│   ├── design.md
│   └── implementation.md
└── ...
```

---

## Project Structure

See [docs/DESIGN.md](docs/DESIGN.md) for full architecture details.

```
src/
├── audio/              # Audio engine modules (metronome, mixer, recorder, etc.)
├── components/         # React UI components
├── contexts/           # React contexts
├── db/                 # IndexedDB layer (Dexie.js)
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
└── tests/              # Test setup and utilities
```

**Audio Pipeline:**
- Recording: MediaStream → AudioWorklet → WAV → IndexedDB
- Playback: AudioBuffer → BufferSource → GainNode → Master Gain (1/√N anti-clipping) → Destination

**685 tests** covering all modules, components, and integration workflows.

---

## Documentation

- **[docs/DESIGN.md](docs/DESIGN.md)** - Complete technical design with EARS requirements
- **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** - Phased implementation plan with progress tracking
- **[docs/transcripts/](docs/transcripts/)** - Full conversation transcripts showing the build process

---

## License

MIT

---

## Technical Notes

- Uses AudioWorklet for low-latency recording (echo cancellation/AGC/noise suppression disabled for clean audio)
- Master gain with 1/√N scaling prevents clipping when multiple tracks play
- All processing happens client-side - no server required
- Target: Modern Chromium browsers (Chrome, Edge, Brave)
