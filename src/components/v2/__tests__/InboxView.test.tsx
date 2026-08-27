import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InboxView from '../InboxView';
import { useSync } from '@/contexts/SyncContext';
import { useToast } from '@/contexts/ToastContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import { apiFetch } from '@/lib/api';

jest.mock('@/contexts/SyncContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/contexts/TaskEditContext');
jest.mock('@/lib/api');

const mockUseSync = useSync as jest.MockedFunction<typeof useSync>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseTaskEdit = useTaskEdit as jest.MockedFunction<typeof useTaskEdit>;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const mockTasks = [
  {
    id: 1,
    content: 'Task 1',
    status: 'todo' as const,
    due_date: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 2,
    content: 'Task 2',
    status: 'todo' as const,
    due_date: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 3,
    content: 'Task 3',
    status: 'todo' as const,
    due_date: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

describe('InboxView Processing Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSync.mockReturnValue({
      tasks: mockTasks,
      events: [],
      initialLoading: false,
      isFetching: false,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });
    
    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
      dismissToast: jest.fn(),
    });
    
    mockUseTaskEdit.mockReturnValue({
      openTaskEdit: jest.fn(),
      createTask: jest.fn(),
      closeTaskEdit: jest.fn(),
    });
    
    mockApiFetch.mockResolvedValue({});
  });

  it('renders Process button when inbox has tasks', () => {
    render(<InboxView />);
    expect(screen.getByText('Process')).toBeInTheDocument();
  });

  it('enters processing mode when Process button is clicked', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    
    expect(screen.getByText(/Needs a decision/)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3/)).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('exits processing mode when Exit button is clicked', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    expect(screen.getByText(/Needs a decision/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Exit'));
    expect(screen.queryByText(/Needs a decision/)).not.toBeInTheDocument();
  });

  it('advances to next task when Skip is clicked', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText(/2 of 3/)).toBeInTheDocument();
  });

  it('advances to next task when Keep Active is clicked', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Keep Active'));
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('shows exhausted state when all tasks are processed', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    fireEvent.click(screen.getByText('Skip'));
    fireEvent.click(screen.getByText('Skip'));
    fireEvent.click(screen.getByText('Skip'));
    
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText(/You've processed all 3 inbox items/)).toBeInTheDocument();
  });

  it('calls delete API when Delete is clicked', async () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    fireEvent.click(screen.getByText('Delete'));
    
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/v2/tasks/1', { method: 'DELETE' });
    });
    
    expect(mockUseSync().removeLocalTask).toHaveBeenCalledWith(1);
  });

  it('opens task edit when Clarify is clicked', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    fireEvent.click(screen.getByText('Clarify'));
    
    expect(mockUseTaskEdit().openTaskEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('handles keyboard shortcut J to skip', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    
    // Blur any focused elements first
    (document.activeElement as HTMLElement)?.blur();
    
    fireEvent.keyDown(window, { key: 'j' });
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('handles keyboard shortcut Enter to clarify', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    
    // Blur any focused elements first
    (document.activeElement as HTMLElement)?.blur();
    
    fireEvent.keyDown(window, { key: 'Enter' });
    
    expect(mockUseTaskEdit().openTaskEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('handles keyboard shortcut Escape to exit', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    expect(screen.getByText(/Needs a decision/)).toBeInTheDocument();
    
    // Blur any focused elements first
    (document.activeElement as HTMLElement)?.blur();
    
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Needs a decision/)).not.toBeInTheDocument();
  });

  it('does not handle keyboard shortcuts when focus is in input', () => {
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    const input = screen.getByPlaceholderText('Add a task to inbox...');
    input.focus();
    
    fireEvent.keyDown(window, { key: 'j' });
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('shows error toast when delete fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Failed'));
    
    render(<InboxView />);
    
    fireEvent.click(screen.getByText('Process'));
    fireEvent.click(screen.getByText('Delete'));
    
    await waitFor(() => {
      expect(mockUseToast().showToast).toHaveBeenCalledWith('Failed to delete task', 'error');
    });
  });
});
