// [EARS: VIS-001, REC-008] Waveform visualization for sparklines

const MIN_SAMPLES = 100;
const MAX_SAMPLES = 200;
const DEFAULT_SAMPLES = 150;

export interface VisualizerConfig {
  sampleCount?: number;
}

/**
 * Clamp sample count to valid range
 */
function clampSampleCount(count: number): number {
  return Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, count));
}

/**
 * Visualizer for generating waveform data from audio
 * [EARS: VIS-001, REC-008]
 */
export class Visualizer {
  private audioContext: AudioContext;
  private sampleCount: number;

  /**
   * Create a new Visualizer
   * [EARS: VIS-001] Initialize with audio context and configuration
   *
   * @param audioContext - Web Audio API AudioContext
   * @param config - Optional configuration (sampleCount: 100-200, default 150)
   */
  constructor(audioContext: AudioContext, config?: VisualizerConfig) {
    this.audioContext = audioContext;
    this.sampleCount = clampSampleCount(config?.sampleCount ?? DEFAULT_SAMPLES);
  }

  /**
   * Generate waveform data from audio blob
   * [EARS: VIS-001, REC-008] Generate sparkline waveform data (100-200 points)
   *
   * @param audioBlob - Audio blob to analyze
   * @returns Array of normalized amplitude values (0-1)
   * @throws Error if audio decoding fails
   */
  async generateWaveform(audioBlob: Blob): Promise<number[]> {
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio blob');
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Extract waveform from audio buffer
      return this.extractWaveform(audioBuffer);
    } catch (error) {
      throw new Error('Failed to generate waveform');
    }
  }

  /**
   * Extract and downsample waveform from AudioBuffer
   * [EARS: VIS-001] Downsample to 100-200 data points
   *
   * @param audioBuffer - Decoded audio buffer
   * @returns Array of normalized amplitude values (0-1)
   */
  private extractWaveform(audioBuffer: AudioBuffer): number[] {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const samples = channelData.length;
    const waveform: number[] = [];

    // Calculate step size for downsampling
    const step = Math.floor(samples / this.sampleCount);

    if (step < 1) {
      // Audio is shorter than target sample count, use all samples
      for (let i = 0; i < samples; i++) {
        waveform.push(Math.abs(channelData[i] ?? 0));
      }

      // Pad with zeros if needed
      while (waveform.length < this.sampleCount) {
        waveform.push(0);
      }
    } else {
      // Downsample by taking maximum absolute value in each window
      for (let i = 0; i < this.sampleCount; i++) {
        const start = i * step;
        const end = Math.min(start + step, samples);
        let max = 0;

        for (let j = start; j < end; j++) {
          const value = Math.abs(channelData[j] ?? 0);
          if (value > max) {
            max = value;
          }
        }

        waveform.push(max);
      }
    }

    // Normalize to 0-1 range
    const maxValue = Math.max(...waveform, 0.01); // Avoid division by zero
    return waveform.map(value => value / maxValue);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Nothing to clean up currently
  }
}
