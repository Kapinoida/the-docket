import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../TaskItem';
import { Task } from '../../../types';
import { TaskEditProvider } from '../../../contexts/TaskEditContext';

// Mock fetch for the provider (it may call API on save)
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
) as jest.Mock;

// Wrapper component that provides required context
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TaskEditProvider>{children}</TaskEditProvider>
);

const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

describe('TaskItem', () => {
  const mockTask: Task = {
    id: 1,
    content: 'Test Task Content',
    status: 'todo',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    due_date: null,
    recurrence_rule: undefined
  };

  const mockOnToggle = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Basic rendering ────────────────────────────────────
  it('renders task content correctly', () => {
    customRender(
      <TaskItem task={mockTask} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    expect(screen.getByDisplayValue('Test Task Content')).toBeInTheDocument();
  });

  it('calls onToggle when check circle is clicked', () => {
    customRender(
      <TaskItem task={mockTask} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnToggle).toHaveBeenCalledWith(1);
  });

  it('updates content on blur after editing', () => {
    customRender(
      <TaskItem task={mockTask} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    const input = screen.getByDisplayValue('Test Task Content');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Updated Content' } });
    fireEvent.blur(input);
    expect(mockOnUpdate).toHaveBeenCalledWith({ content: 'Updated Content' });
  });

  // ── Completed state ────────────────────────────────────
  it('renders completed state correctly', () => {
    const completedTask = { ...mockTask, status: 'done' as const };
    customRender(
      <TaskItem task={completedTask} onToggle={mockOnToggle} />
    );
    expect(screen.getByText('Test Task Content')).toHaveClass('line-through');
  });

  // ── Date badge ─────────────────────────────────────────
  it('renders due date in MMM d format', () => {
    const taskWithDate: Task = {
      ...mockTask,
      due_date: '2026-05-18T00:00:00.000Z'
    };
    customRender(
      <TaskItem task={taskWithDate} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    expect(screen.getByText('May 18')).toBeInTheDocument();
  });

  it('renders time alongside date when time is not midnight', () => {
    const taskWithTime: Task = {
      ...mockTask,
      due_date: '2026-05-18T15:30:00.000Z'
    };
    customRender(
      <TaskItem task={taskWithTime} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    expect(screen.getByText(/May 18/)).toBeInTheDocument();
  });

  it('shows recurrence clock icon when task has recurrence rule', () => {
    const recurringTask: Task = {
      ...mockTask,
      due_date: '2026-05-18T00:00:00.000Z',
      recurrence_rule: { type: 'weekly', interval: 1 }
    };
    customRender(
      <TaskItem task={recurringTask} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    const buttons = screen.getAllByRole('button');
    const dateBtn = buttons.find(b => b.textContent?.includes('May 18'));
    expect(dateBtn).toBeTruthy();
  });

  // ── page_name pill ─────────────────────────────────────
  it('renders page_name pill when task has page context', () => {
    const taskWithPage: Task = {
      ...mockTask,
      page_name: 'Job Search 2026'
    };
    customRender(
      <TaskItem task={taskWithPage} onToggle={mockOnToggle} onUpdate={mockOnUpdate} />
    );
    expect(screen.getByText('Job Search 2026')).toBeInTheDocument();
  });

  it('hides page_name pill when task is done', () => {
    const doneTaskWithPage: Task = {
      ...mockTask,
      status: 'done',
      page_name: 'Job Search 2026'
    };
    customRender(
      <TaskItem task={doneTaskWithPage} onToggle={mockOnToggle} />
    );
    expect(screen.queryByText('Job Search 2026')).not.toBeInTheDocument();
  });
});
