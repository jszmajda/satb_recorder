import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock TopBar component
vi.mock('./components/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar">TopBar Component</div>,
}));

describe('App', () => {
  test('renders the TopBar component', () => {
    render(<App />);
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
  });

  test('displays application description', () => {
    render(<App />);
    expect(screen.getByText(/Multi-track vocal harmony recorder/i)).toBeInTheDocument();
  });
});
