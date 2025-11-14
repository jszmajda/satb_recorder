// [EARS: ERR-001, ERR-002, ERR-003] Global error state management

import { create } from 'zustand';

export interface ErrorState {
  /** Current error message, or null if no error */
  error: string | null;

  /** Set an error message */
  setError: (error: string | null) => void;

  /** Clear the current error */
  clearError: () => void;
}

/**
 * Global error store for managing application-wide error messages
 * [EARS: ERR-001, ERR-002, ERR-003] Error state management
 */
export const useErrorStore = create<ErrorState>((set) => ({
  error: null,

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
