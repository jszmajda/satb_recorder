// [EARS: MIC-001 through MIC-004, REC-001, ERR-001] Audio recorder with device management

/**
 * Audio recorder for capturing microphone input
 * [EARS: MIC-001, MIC-002, MIC-003, MIC-004, REC-001, ERR-001]
 */
export class Recorder {
  private selectedDeviceId: string | null = null;
  private hasPermissionGranted: boolean = false;
  private currentStream: MediaStream | null = null;

  /**
   * Create a new Recorder
   */
  constructor() {
    // Initialize recorder
  }

  /**
   * Enumerate available microphone devices
   * [EARS: MIC-001] Enumerate all available microphone devices
   *
   * @returns Array of audio input devices
   */
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Filter for audio input devices only
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get currently selected device ID
   * [EARS: MIC-002] Device selection tracking
   *
   * @returns Selected device ID or null
   */
  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  /**
   * Set selected microphone device
   * [EARS: MIC-002, MIC-003] Device selection and usage
   *
   * @param deviceId - Device ID to select, or null to clear selection
   */
  setSelectedDevice(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
  }

  /**
   * Check if microphone permission has been granted
   *
   * @returns True if permission granted
   */
  hasPermission(): boolean {
    return this.hasPermissionGranted;
  }

  /**
   * Request microphone access
   * [EARS: REC-001] Request microphone permissions
   * [EARS: MIC-003] Use selected device for recording
   * [EARS: MIC-004, ERR-001] Handle permission errors
   *
   * @returns MediaStream from microphone
   * @throws Error if permission denied or device not available
   */
  async requestMicrophoneAccess(): Promise<MediaStream> {
    // Stop previous stream if exists
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    try {
      // Build constraints based on selected device
      const constraints: MediaStreamConstraints = {
        audio: this.selectedDeviceId
          ? { deviceId: { exact: this.selectedDeviceId } }
          : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.currentStream = stream;
      this.hasPermissionGranted = true;

      return stream;
    } catch (error) {
      // Handle specific error types
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Microphone permission denied');
          case 'NotFoundError':
            throw new Error('Microphone device not found');
          case 'NotReadableError':
            throw new Error('Microphone device is already in use');
          default:
            throw new Error('Failed to access microphone');
        }
      }

      // Re-throw other errors
      throw new Error('Failed to access microphone');
    }
  }

  /**
   * Dispose of resources and stop active streams
   */
  dispose(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    this.hasPermissionGranted = false;
    this.selectedDeviceId = null;
  }
}
