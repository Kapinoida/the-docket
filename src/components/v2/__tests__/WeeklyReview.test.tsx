import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WeeklyReview from '../WeeklyReview';
import { useSync } from '@/contexts/SyncContext';
import { useToast } from '@/contexts/ToastContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import { apiFetch } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/review',
}));
jest.mock('@/contexts/SyncContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/contexts/TaskEditContext');
jest.mock('@/lib/api');
jest.mock('@/components/calendar/EventCard', () => {
  const MockEventCard = ({ event }: { event: any }) => <div data-testid={`event-${event.id}`}>{event.title}</div>;
  MockEventCard.displayName = 'MockEventCard';
  return { EventCard: MockEventCard };
});
jest.mock('@/components/calendar/CalendarTaskCard', () => {
  const MockCalendarTaskCard = ({ task }: { task: any }) => <div data-testid={`task-${task.id}`}>{task.content}</div>;
  MockCalendarTaskCard.displayName = 'MockCalendarTaskCard';
  return { CalendarTaskCard: MockCalendarTaskCard };
});
jest.mock('@/components/modals/EventDetailModal', () => {
  const MockEventDetailModal = () => null;
  MockEventDetailModal.displayName = 'MockEventDetailModal';
  return MockEventDetailModal;
});

const mockUseSync = useSync as jest.MockedFunction<typeof useSync>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseTaskEdit = useTaskEdit as jest.MockedFunction<typeof useTaskEdit>;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const in3Days = new Date();
in3Days.setDate(in3Days.getDate() + 3);

const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 20);

const mockTasks = [
  {
    id: 1,
    content: 'Overdue task',
    status: 'todo' as const,
    due_date: yesterday.toISOString(),
    created_at: '2026-01-01',
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    content: 'Stale task',
    status: 'todo' as const,
    due_date: null,
    page_name: 'Some Page',
    created_at: '2026-01-01',
    updated_at: oldDate.toISOString(),
  },
  {
    id: 3,
    content: 'Lookahead task',
    status: 'todo' as const,
    due_date: in3Days.toISOString(),
    created_at: '2026-01-01',
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    content: 'Inbox task',
    status: 'todo' as const,
    due_date: null,
    page_name: undefined,
    created_at: '2026-01-01',
    updated_at: new Date().toISOString(),
  },
];

const mockEvents = [
  {
    id: 'evt-1',
    title: 'Lookahead event',
    description: '',
    start_time: in3Days.toISOString(),
    end_time: new Date(in3Days.getTime() + 3600000).toISOString(),
    is_all_day: false,
    location: '',
    calendar_name: 'Test',
  },
];

describe('WeeklyReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSync.mockReturnValue({
      tasks: mockTasks,
      events: mockEvents,
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
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/api/v2/decisions')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ success: true });
    });
  });

  it('renders header with Weekly Review title', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Weekly Review')).toBeInTheDocument();
  });

  it('renders week range', () => {
    render(<WeeklyReview />);
    const rangeElements = screen.getAllByText(/–/);
    expect(rangeElements.length).toBeGreaterThan(0);
  });

  it('renders Loose ends section', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Loose ends')).toBeInTheDocument();
  });

  it('renders Stale items section', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Stale items')).toBeInTheDocument();
  });

  it('renders Overdue decisions section', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Overdue decisions')).toBeInTheDocument();
  });

  it('renders Next 14 days section', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Next 14 days')).toBeInTheDocument();
  });

  it('renders Review closeout section', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Review closeout')).toBeInTheDocument();
  });

  it('shows stale task with age', () => {
    render(<WeeklyReview />);
    expect(screen.getByText('Stale task')).toBeInTheDocument();
    expect(screen.getByText(/Last updated \d+ days ago/)).toBeInTheDocument();
  });

  it('shows overdue task with overdue days', () => {
    render(<WeeklyReview />);
    expect(screen.getByText(/1 day overdue/)).toBeInTheDocument();
  });

  it('shows lookahead event', () => {
    render(<WeeklyReview />);
    expect(screen.getByTestId('event-evt-1')).toBeInTheDocument();
  });

  it('shows lookahead task', () => {
    render(<WeeklyReview />);
    expect(screen.getByTestId('task-3')).toBeInTheDocument();
  });

  it('calls openTaskEdit when clarify is clicked on overdue item', () => {
    render(<WeeklyReview />);
    const clarifyButton = screen.getByText('Clarify');
    fireEvent.click(clarifyButton);
    expect(mockUseTaskEdit().openTaskEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('dismisses overdue item when keep active is clicked', () => {
    render(<WeeklyReview />);
    const keepActiveButton = screen.getByText('Keep active');
    fireEvent.click(keepActiveButton);
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
  });

  it('calls delete API when delete is clicked on overdue item', async () => {
    render(<WeeklyReview />);
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/v2/tasks/1', { method: 'DELETE' });
    });
  });

  it('shows empty message for sections with no items', () => {
    mockUseSync.mockReturnValue({
      tasks: [],
      events: [],
      initialLoading: false,
      isFetching: false,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });
    render(<WeeklyReview />);
    expect(screen.getByText('Everything is sorted')).toBeInTheDocument();
    expect(screen.getByText('Nothing stale')).toBeInTheDocument();
    expect(screen.getByText('Nothing overdue')).toBeInTheDocument();
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();
  });

  it('shows closeout inputs', () => {
    render(<WeeklyReview />);
    expect(screen.getByPlaceholderText('Outcome 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Outcome 2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Outcome 3')).toBeInTheDocument();
  });

  it('disables save button when no outcomes are filled', () => {
    render(<WeeklyReview />);
    const saveButton = screen.getByText('Save to journal');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when at least one outcome is filled', () => {
    render(<WeeklyReview />);
    const input = screen.getByPlaceholderText('Outcome 1');
    fireEvent.change(input, { target: { value: 'Finish project' } });
    const saveButton = screen.getByText('Save to journal');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls API when save closeout is clicked', async () => {
    render(<WeeklyReview />);
    const input = screen.getByPlaceholderText('Outcome 1');
    fireEvent.change(input, { target: { value: 'Finish project' } });
    const saveButton = screen.getByText('Save to journal');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/v2/weekly-review', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('shows loading state when initial loading', () => {
    mockUseSync.mockReturnValue({
      tasks: [],
      events: [],
      initialLoading: true,
      isFetching: false,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });
    render(<WeeklyReview />);
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });
});
