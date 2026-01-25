import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../TaskItem';
import { Task } from '../../../types/v2';

// Mock Lucide icons to avoid any rendering issues (though usually fine)
// We'll trust standard rendering for now.

describe('TaskItem', () => {
  const mockTask: Task = {
    id: 1,
    content: 'Test Task Content',
    status: 'todo',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
    due_date: null,
    recurrence_rule: null
  };

  const mockOnToggle = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task content correctly', () => {
    render(
      <TaskItem 
        task={mockTask} 
        onToggle={mockOnToggle} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // It renders as a div when not editing (unless using input mode which TaskItem seems to use unconditionally for "onUpdate" presence?)
    // Let's check the code: if (onUpdate) -> input.
    expect(screen.getByDisplayValue('Test Task Content')).toBeInTheDocument();
  });

  it('calls onToggle when check circle is clicked', () => {
    render(
      <TaskItem 
        task={mockTask} 
        onToggle={mockOnToggle} 
        onUpdate={mockOnUpdate} 
      />
    );

    // Find the button wrapping the circle (it has onClick=onToggle)
    // We can find by role button. There might be multiple (date picker).
    // The completion circle is the first one or distinct.
    // Let's rely on the structure or class if needed, or better:
    // The date picker button has text or calendar icon.
    // The completion button just has the Circle/CheckCircle.
    
    // We can try getting by role 'button' and picking index, or adding aria-label in source would be better.
    // For now, let's assume it's the first button in standard layout.
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Checkbox is usually first
    
    expect(mockOnToggle).toHaveBeenCalledWith(1);
  });

  it('updates content on blur after editing', () => {
    render(
        <TaskItem 
          task={mockTask} 
          onToggle={mockOnToggle} 
          onUpdate={mockOnUpdate} 
        />
    );

    const input = screen.getByDisplayValue('Test Task Content');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Updated Content' } });
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith({ content: 'Updated Content' });
  });

  it('renders completed state correctly', () => {
      const completedTask = { ...mockTask, status: 'done' as const };
      render(
        <TaskItem 
          task={completedTask} 
          onToggle={mockOnToggle} 
        />
      );
      
      // Check for line-through decoration or similar, but harder to check styles.
      // We can check if the CheckCircle icon is present (rendered by lucide).
      // RTL doesn't check internal Icon logic easily, but we can verify component structure or assumed class.
      // Let's just verify it renders without error for now.
      expect(screen.getByText('Test Task Content')).toHaveClass('line-through');
  });
});
