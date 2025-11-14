// [EARS: PROJ-005, PROJ-006, PROJ-007, PROJ-008] IndexedDB storage with Dexie.js

import Dexie, { type EntityTable } from 'dexie';
import type { Project, Track } from '@/store/types';

// Define the database schema
class RecorderDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  tracks!: EntityTable<Track, 'id'>;

  constructor() {
    super('RecorderDB');

    // Define schema version 1
    this.version(1).stores({
      // [EARS: PROJ-006] Projects table with indexed id
      projects: 'id, name, createdAt, updatedAt',
      // [EARS: REC-009] Tracks table with indexed id and voicePartType for querying
      tracks: 'id, voicePartType, name, createdAt',
    });
  }
}

// Create and export the database instance
export const db = new RecorderDatabase();

/**
 * Initialize the database.
 * This function can be called to ensure the database is ready.
 * Dexie will automatically open the database when needed, but
 * explicit initialization can be useful for testing.
 *
 * [EARS: PROJ-005] Database initialization for auto-save
 */
export async function initializeDatabase(): Promise<void> {
  await db.open();
}
