import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock components
vi.mock('./components/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar">TopBar Component</div>,
}));

vi.mock('./components/MetronomeControl', () => ({
  MetronomeControl: () => <div data-testid="metronome">Metronome Component</div>,
}));

vi.mock('./components/MicrophoneSelector', () => ({
  MicrophoneSelector: () => <div data-testid="microphone">Microphone Component</div>,
}));

// Mock the store
vi.mock('./store/useProjectStore', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      currentProject: null,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('App', () => {
  test('renders the TopBar component', () => {
    render(<App />);
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
  });

  test('displays application description when no project loaded', () => {
    render(<App />);
    expect(screen.getByText(/Multi-track vocal harmony recorder/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a new project to get started/i)).toBeInTheDocument();
  });
});
