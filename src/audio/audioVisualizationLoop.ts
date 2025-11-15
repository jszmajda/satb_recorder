// AudioVisualizationLoop - Centralized requestAnimationFrame loop for all visualizations
// Uses a single RAF loop to update all visualization subscribers efficiently

type VisualizationCallback = () => void;

/**
 * Centralized visualization loop using requestAnimationFrame
 * Manages a single RAF loop for all visualizations (VU meters, waveforms, etc.)
 * Only runs when there are active subscribers
 */
export class AudioVisualizationLoop {
  private subscribers: Set<VisualizationCallback> = new Set();
  private rafId: number | null = null;
  private isRunning: boolean = false;

  /**
   * Subscribe to the visualization loop
   * Automatically starts the loop if not already running
   *
   * @param callback - Function to call on each animation frame
   * @returns Unsubscribe function
   */
  subscribe(callback: VisualizationCallback): () => void {
    this.subscribers.add(callback);

    // Start loop if not already running
    if (!this.isRunning) {
      this.start();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);

      // Stop loop if no more subscribers
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  /**
   * Start the RAF loop
   */
  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.loop();
  }

  /**
   * Stop the RAF loop
   */
  private stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Main RAF loop
   * Calls all subscriber callbacks on each frame
   */
  private loop = (): void => {
    if (!this.isRunning) return;

    // Call all subscriber callbacks
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in visualization callback:', error);
      }
    });

    // Schedule next frame
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * Dispose of the loop (cleanup)
   */
  dispose(): void {
    this.stop();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const audioVisualizationLoop = new AudioVisualizationLoop();
