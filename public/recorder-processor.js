// AudioWorklet processor for real-time audio recording
// Runs on the audio rendering thread (separate from main thread)

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    this.recordedSamples = [];
    this.sampleRate = 0;

    // Listen for commands from main thread
    this.port.onmessage = (event) => {
      const { command, sampleRate } = event.data;

      if (command === 'start') {
        this.isRecording = true;
        this.recordedSamples = [];
        this.sampleRate = sampleRate;
        this.startTime = currentTime;
      } else if (command === 'stop') {
        this.isRecording = false;
        const duration = currentTime - this.startTime;

        // Send recorded data back to main thread
        this.port.postMessage({
          samples: this.recordedSamples,
          sampleRate: this.sampleRate,
          duration: duration
        });
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // Record if active and we have input
    if (this.isRecording && input.length > 0) {
      const channelData = input[0]; // Mono channel (left channel)

      // Copy samples to our buffer
      // We must copy because the input buffer is reused by the audio system
      const samples = new Float32Array(channelData.length);
      samples.set(channelData);
      this.recordedSamples.push(samples);
    }

    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('recorder-processor', RecorderProcessor);
