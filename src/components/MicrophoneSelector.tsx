// [EARS: MIC-002, MIC-003] Microphone device selector with enumeration and selection

import { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/recorder';

interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

export function MicrophoneSelector() {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Initialize recorder and enumerate devices on mount
   * [EARS: MIC-002] Enumerate devices on component load
   */
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    recorderRef.current = new Recorder(audioContextRef.current);

    // Initial device enumeration
    enumerateDevices();

    // Cleanup on unmount
    return () => {
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Enumerate microphone devices
   * [EARS: MIC-002] List all available microphones
   */
  const enumerateDevices = async () => {
    if (!recorderRef.current) {
      console.log('Recorder ref not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Enumerating devices...');
      const deviceList = await recorderRef.current.enumerateDevices();
      console.log('Found devices:', deviceList);

      // Map to simpler format with labels
      // Filter out devices with empty IDs (placeholder devices before permission)
      const mappedDevices = deviceList
        .filter(device => device.deviceId !== '')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
        }));

      console.log('Mapped devices:', mappedDevices);
      setDevices(mappedDevices);

      // If no real devices found, show a message
      if (mappedDevices.length === 0 && deviceList.length > 0) {
        setError('Click "Refresh" to grant microphone permission and see available devices');
      }

      // Check if there's already a selected device
      const currentDevice = recorderRef.current.getSelectedDeviceId();
      if (currentDevice) {
        setSelectedDeviceId(currentDevice);
      }
    } catch (err) {
      setError('Error loading microphones');
      console.error('Failed to enumerate devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle device selection change
   * [EARS: MIC-003] Select a specific microphone device
   */
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;

    if (!recorderRef.current) return;

    if (deviceId === '') {
      // Clear selection
      recorderRef.current.setSelectedDevice(null);
      setSelectedDeviceId(null);
    } else {
      // Select device (pass the ID as-is, even if it doesn't exist in the list)
      // The Recorder class will handle invalid IDs
      recorderRef.current.setSelectedDevice(deviceId);
      setSelectedDeviceId(deviceId);
    }
  };

  /**
   * Handle refresh button click
   * [EARS: MIC-002] Re-enumerate devices
   * Request permission first to get actual device labels
   */
  const handleRefresh = async () => {
    if (!recorderRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Request permission to unlock device labels
      console.log('Requesting microphone permission...');
      const stream = await recorderRef.current.requestMicrophoneAccess();
      console.log('Permission granted, stopping stream...');

      // Stop the stream immediately - we just needed it to unlock permissions
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with full labels
      await enumerateDevices();
    } catch (err) {
      if (err instanceof Error && err.message.includes('permission denied')) {
        setError('Microphone permission denied. Please allow access to see available microphones.');
      } else {
        setError('Error accessing microphones');
      }
      console.error('Failed to request permission:', err);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="microphone-selector"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
        backgroundColor: '#2c2c2c',
        border: '1px solid #444',
        borderRadius: '8px',
      }}
    >
      {/* Device Selector Dropdown */}
      {/* [EARS: MIC-002, MIC-003] Microphone selection dropdown */}
      <div style={{ flex: 1 }}>
        <select
          value={selectedDeviceId || ''}
          onChange={handleDeviceChange}
          disabled={isLoading || error !== null}
          aria-label="Microphone"
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '0.9rem',
            backgroundColor: '#444',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: isLoading || error !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {/* Loading state */}
          {isLoading && <option value="">Loading microphones...</option>}

          {/* Error state */}
          {error && <option value="">Error loading microphones</option>}

          {/* No devices found */}
          {!isLoading && !error && devices.length === 0 && (
            <option value="">No microphones found</option>
          )}

          {/* Normal state with devices */}
          {!isLoading && !error && devices.length > 0 && (
            <>
              <option value="">Select a microphone</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Refresh Button */}
      {/* [EARS: MIC-002] Refresh device list */}
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        aria-label="Refresh microphones"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isLoading ? '#666' : '#2196f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '0.9rem',
        }}
      >
        Refresh
      </button>
    </div>
  );
}
