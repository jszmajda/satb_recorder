// [EARS: REC-009, REC-010, TRACK-001, TRACK-006, TRACK-008] Track CRUD operations

import { db } from './index';
import { getProject, updateProject } from './projects';
import type { Track, VoicePartType } from '@/store/types';

/**
 * Generate a unique ID for tracks
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate auto-incremented track name based on voice part
 * [EARS: REC-010] Auto-generate track names (e.g., "S1", "S2", ...)
 *
 * @param voicePartType - Voice part type (S, A, T, B)
 * @param existingTracks - Existing tracks for this voice part
 * @returns Generated track name
 */
function generateTrackName(voicePartType: VoicePartType, existingTracks: Track[]): string {
  const trackNumber = existingTracks.length + 1;
  return `${voicePartType}${trackNumber}`;
}

/**
 * Validate voice part type
 */
function isValidVoicePartType(type: string): type is VoicePartType {
  return ['S', 'A', 'T', 'B'].includes(type);
}

/**
 * Clamp volume to valid range (0-100)
 */
function clampVolume(volume: number): number {
  return Math.max(0, Math.min(100, volume));
}

/**
 * Add a new track to a project's voice part
 * [EARS: REC-009] Auto-save track to IndexedDB
 * [EARS: REC-010] Auto-generate track name
 * [EARS: REC-011] Limit to 8 tracks per voice part
 *
 * @param projectId - Project ID
 * @param voicePartType - Voice part type (S, A, T, B)
 * @param trackData - Track data (audioBlob, duration, waveformData)
 * @returns Track ID
 * @throws Error if project not found, invalid voice part, or track limit reached
 */
export async function addTrackToProject(
  projectId: string,
  voicePartType: VoicePartType,
  trackData: {
    audioBlob: Blob;
    duration: number;
    waveformData: number[];
  }
): Promise<string> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (!isValidVoicePartType(voicePartType)) {
    throw new Error('Invalid voice part type');
  }

  const voicePart = project.voiceParts.find(vp => vp.type === voicePartType);
  if (!voicePart) {
    throw new Error('Voice part not found');
  }

  // [EARS: REC-011] Enforce 8-track limit
  if (voicePart.tracks.length >= 8) {
    throw new Error('Maximum 8 tracks per voice part');
  }

  // Create the track
  const track: Track = {
    id: generateId(),
    voicePartType,
    name: generateTrackName(voicePartType, voicePart.tracks), // [EARS: REC-010]
    audioBlob: trackData.audioBlob,
    duration: trackData.duration,
    volume: 80, // Default volume
    muted: false,
    soloed: false,
    waveformData: trackData.waveformData,
    createdAt: new Date(),
  };

  // Store track in IndexedDB tracks table
  await db.tracks.add(track);

  // Add track reference to project voice part
  const updatedVoiceParts = project.voiceParts.map(vp => {
    if (vp.type === voicePartType) {
      return {
        ...vp,
        tracks: [...vp.tracks, track],
      };
    }
    return vp;
  });

  await updateProject(projectId, { voiceParts: updatedVoiceParts });

  return track.id;
}

/**
 * Get a track by ID
 *
 * @param id - Track ID
 * @returns Track or undefined if not found
 */
export async function getTrack(id: string): Promise<Track | undefined> {
  return await db.tracks.get(id);
}

/**
 * Get all tracks for a project
 * [EARS: PROJ-007] Restore project metadata and audio tracks
 *
 * @param projectId - Project ID
 * @returns Array of tracks
 * @throws Error if project not found
 */
export async function getProjectTracks(projectId: string): Promise<Track[]> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Collect all tracks from all voice parts
  const tracks: Track[] = [];
  for (const voicePart of project.voiceParts) {
    tracks.push(...voicePart.tracks);
  }

  return tracks;
}

/**
 * Update a track
 * [EARS: TRACK-006] Set mute flag
 * [EARS: TRACK-008] Update GainNode gain
 * [EARS: TRACK-009] Preserve volume when muted
 * [EARS: TRACK-010] Edit track name
 *
 * @param id - Track ID
 * @param updates - Partial track data to update
 * @throws Error if track not found
 */
export async function updateTrack(
  id: string,
  updates: Partial<Omit<Track, 'id' | 'voicePartType' | 'audioBlob' | 'createdAt'>>
): Promise<void> {
  const track = await db.tracks.get(id);
  if (!track) {
    throw new Error('Track not found');
  }

  // Clamp volume if it's being updated
  if (updates.volume !== undefined) {
    updates.volume = clampVolume(updates.volume);
  }

  const updatedTrack: Track = {
    ...track,
    ...updates,
  };

  await db.tracks.put(updatedTrack);

  // Also update the track in the project's voice part
  // Find which project contains this track
  const allProjects = await db.projects.toArray();
  for (const project of allProjects) {
    let trackFound = false;
    const updatedVoiceParts = project.voiceParts.map(vp => {
      const trackIndex = vp.tracks.findIndex(t => t.id === id);
      if (trackIndex !== -1) {
        trackFound = true;
        const updatedTracks = [...vp.tracks];
        updatedTracks[trackIndex] = updatedTrack;
        return { ...vp, tracks: updatedTracks };
      }
      return vp;
    });

    if (trackFound) {
      await updateProject(project.id, { voiceParts: updatedVoiceParts });
      break;
    }
  }
}

/**
 * Delete a track
 * [EARS: TRACK-001] Store in undo state (handled by caller)
 * [EARS: TRACK-002] Remove from IndexedDB and UI
 *
 * @param projectId - Project ID
 * @param trackId - Track ID
 * @throws Error if project or track not found
 */
export async function deleteTrack(projectId: string, trackId: string): Promise<void> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const track = await db.tracks.get(trackId);
  if (!track) {
    throw new Error('Track not found');
  }

  // Remove track from IndexedDB
  await db.tracks.delete(trackId);

  // Remove track from project voice part
  const updatedVoiceParts = project.voiceParts.map(vp => ({
    ...vp,
    tracks: vp.tracks.filter(t => t.id !== trackId),
  }));

  await updateProject(projectId, { voiceParts: updatedVoiceParts });
}
