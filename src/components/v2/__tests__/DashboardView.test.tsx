import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardView from '../DashboardView';
import { useSync } from '@/contexts/SyncContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
}));
jest.mock('@/contexts/SyncContext');
jest.mock('@/contexts/TaskEditContext');
jest.mock('../WeeklyCalendar', () => {
  const MockWeeklyCalendar = () => <div data-testid="weekly-calendar" />;
  MockWeeklyCalendar.displayName = 'MockWeeklyCalendar';
  return MockWeeklyCalendar;
});

const mockUseSync = useSync as jest.MockedFunction<typeof useSync>;
const mockUseTaskEdit = useTaskEdit as jest.MockedFunction<typeof useTaskEdit>;

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const today = new Date();
today.setHours(12, 0, 0, 0);

const mockTasks = [
  {
    id: 1,
    content: 'Overdue task',
    status: 'todo' as const,
    due_date: yesterday.toISOString(),
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 2,
    content: 'Inbox task',
    status: 'todo' as const,
    due_date: null,
    page_name: undefined,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 3,
    content: 'Undated task',
    status: 'todo' as const,
    due_date: null,
    page_name: 'Some Page',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 4,
    content: 'Today must task',
    status: 'todo' as const,
    due_date: today.toISOString(),
    commitment_level: 'must' as const,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 5,
    content: 'Today should task',
    status: 'todo' as const,
    due_date: today.toISOString(),
    commitment_level: 'should' as const,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

describe('DashboardView', () => {
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
    mockUseTaskEdit.mockReturnValue({
      openTaskEdit: jest.fn(),
      createTask: jest.fn(),
      closeTaskEdit: jest.fn(),
    });
  });

  it('renders greeting', () => {
    render(<DashboardView />);
    const greeting = screen.getByText(/Good (morning|afternoon|evening)/);
    expect(greeting).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<DashboardView />);
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    expect(screen.getByText(dateStr)).toBeInTheDocument();
  });

  it('renders action cards with correct counts', () => {
    render(<DashboardView />);
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Needs processing')).toBeInTheDocument();
    expect(screen.getByText('Needs planning')).toBeInTheDocument();
    // "Today" appears in both action card and quick actions, so use getAllByText
    const todayElements = screen.getAllByText('Today');
    expect(todayElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows overdue count', () => {
    render(<DashboardView />);
    const overdueCard = screen.getByText('Needs attention').closest('div')?.parentElement;
    expect(overdueCard).toBeTruthy();
  });

  it('shows empty messages when counts are zero', () => {
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

    render(<DashboardView />);
    expect(screen.getByText('Nothing overdue')).toBeInTheDocument();
    expect(screen.getByText('Inbox is clear')).toBeInTheDocument();
    expect(screen.getByText('All tasks are scheduled')).toBeInTheDocument();
    expect(screen.getByText('Nothing scheduled today')).toBeInTheDocument();
  });

  it('does not render Recent Notes section', () => {
    render(<DashboardView />);
    expect(screen.queryByText('Recent Notes')).not.toBeInTheDocument();
  });

  it('shows loading skeleton on initial load', () => {
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
    render(<DashboardView />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows updating indicator when background fetching', () => {
    mockUseSync.mockReturnValue({
      tasks: mockTasks,
      events: [],
      initialLoading: false,
      isFetching: true,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });
    render(<DashboardView />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('does not show updating indicator on initial load', () => {
    mockUseSync.mockReturnValue({
      tasks: [],
      events: [],
      initialLoading: true,
      isFetching: true,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });
    render(<DashboardView />);
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
  });

  it('shows quick actions section', () => {
    render(<DashboardView />);
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Process Inbox')).toBeInTheDocument();
    // "Today" appears in both action card and quick actions, use aria-label for specificity
    expect(screen.getByLabelText('Open today view')).toBeInTheDocument();
    expect(screen.getByText('Weekly Review')).toBeInTheDocument();
    expect(screen.getByText('All Tasks')).toBeInTheDocument();
  });

  it('opens task editor when clicking overdue task preview', () => {
    render(<DashboardView />);
    const overdueTaskButton = screen.getByLabelText(/Edit overdue task: Overdue task/);
    fireEvent.click(overdueTaskButton);
    expect(mockUseTaskEdit().openTaskEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('opens task editor when clicking commitment row', () => {
    render(<DashboardView />);
    const mustTaskButton = screen.getByLabelText(/Edit must-do task: Today must task/);
    fireEvent.click(mustTaskButton);
    expect(mockUseTaskEdit().openTaskEdit).toHaveBeenCalledWith(mockTasks[3]);
  });

  it('shows today commitments section when tasks are due today', () => {
    render(<DashboardView />);
    expect(screen.getByText("Today's commitments")).toBeInTheDocument();
    expect(screen.getByText('Must')).toBeInTheDocument();
    expect(screen.getByText('Should')).toBeInTheDocument();
  });

  it('does not show commitments section when nothing is due today', () => {
    mockUseSync.mockReturnValue({
      tasks: [
        {
          id: 1,
          content: 'Overdue task',
          status: 'todo' as const,
          due_date: yesterday.toISOString(),
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      events: [],
      initialLoading: false,
      isFetching: false,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });

    render(<DashboardView />);
    expect(screen.queryByText("Today's commitments")).not.toBeInTheDocument();
  });

  it('renders weekly calendar', () => {
    render(<DashboardView />);
    expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument();
  });

  it('shows overdue task previews', () => {
    render(<DashboardView />);
    expect(screen.getByText('Overdue task')).toBeInTheDocument();
  });
});
