import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { useRouter } from 'next/navigation';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock cmdk to avoid complex DOM structures if needed, but let's try with real one first.
// If cmdk fails in JSDOM, we might need to mock ResizeObserver.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

// Fix for cmdk scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();


describe('CommandPalette', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  it('is closed by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it('opens on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('searches and displays results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, title: 'Test Page', type: 'page' },
        { id: 2, content: 'Test Task', type: 'task', page_title: 'Context' }
      ],
    });

    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Test' } });

    // Wait for debounce and fetch
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v2/search?q=Test'));
    });

    // Check results
    await waitFor(() => {
        expect(screen.getByText('Test Page')).toBeInTheDocument();
        expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  it('navigates to page on selection', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 10, title: 'Target Page', type: 'page' }],
    });

    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Target' } });

    await waitFor(() => expect(screen.getByText('Target Page')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Target Page'));

    expect(mockPush).toHaveBeenCalledWith('/page/10');
  });
});
