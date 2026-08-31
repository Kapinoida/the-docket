import React from 'react';
import { render, screen } from '@testing-library/react';
import TodayView from '../TodayView';
import { useSync } from '@/contexts/SyncContext';
import { useToast } from '@/contexts/ToastContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import { apiFetch } from '@/lib/api';

jest.mock('@/contexts/SyncContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/contexts/TaskEditContext');
jest.mock('@/lib/api');
jest.mock('../DailyJournalEditor', () => {
  const MockDailyJournalEditor = () => <div data-testid="daily-journal" />;
  MockDailyJournalEditor.displayName = 'MockDailyJournalEditor';
  return MockDailyJournalEditor;
});

const mockUseSync = useSync as jest.MockedFunction<typeof useSync>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseTaskEdit = useTaskEdit as jest.MockedFunction<typeof useTaskEdit>;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const today = new Date();
today.setHours(12, 0, 0, 0);
const todayStr = today.toISOString();

const mockTasks = [
  {
    id: 1,
    content: 'Must task',
    status: 'todo' as const,
    due_date: todayStr,
    commitment_level: 'must' as const,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 2,
    content: 'Should task',
    status: 'todo' as const,
    due_date: todayStr,
    commitment_level: 'should' as const,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 3,
    content: 'Could task',
    status: 'todo' as const,
    due_date: todayStr,
    commitment_level: 'could' as const,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 4,
    content: 'Unassigned task',
    status: 'todo' as const,
    due_date: todayStr,
    commitment_level: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

describe('TodayView Commitment Sections', () => {
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

  it('renders Must section with must tasks', () => {
    render(<TodayView />);
    expect(screen.getByDisplayValue('Must task')).toBeInTheDocument();
    expect(screen.getByText('Must')).toBeInTheDocument();
  });

  it('renders Should section with should tasks', () => {
    render(<TodayView />);
    expect(screen.getByDisplayValue('Should task')).toBeInTheDocument();
    expect(screen.getByText('Should')).toBeInTheDocument();
  });

  it('renders Could section with could tasks', () => {
    render(<TodayView />);
    expect(screen.getByDisplayValue('Could task')).toBeInTheDocument();
    expect(screen.getByText('Could')).toBeInTheDocument();
  });

  it('renders Unassigned section with unassigned tasks', () => {
    render(<TodayView />);
    expect(screen.getByDisplayValue('Unassigned task')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('does not render empty sections', () => {
    const tasksWithoutMust = mockTasks.filter(t => t.commitment_level !== 'must');
    mockUseSync.mockReturnValue({
      tasks: tasksWithoutMust,
      events: [],
      initialLoading: false,
      isFetching: false,
      refetch: jest.fn(),
      updateLocalTask: jest.fn(),
      removeLocalTask: jest.fn(),
      addLocalTask: jest.fn(),
    });

    render(<TodayView />);
    expect(screen.queryByDisplayValue('Must task')).not.toBeInTheDocument();
    expect(screen.queryByText('Must')).not.toBeInTheDocument();
  });

  it('shows empty state when no tasks or events', () => {
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

    render(<TodayView />);
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });
});
