import { render, screen } from '@testing-library/react';
import FolderTree from '../FolderTree';
import { TaskEditProvider } from '../../contexts/TaskEditContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TaskEditProvider>{children}</TaskEditProvider>
);

const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

describe('FolderTree', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
  });

  it('renders toolbar buttons', () => {
    customRender(<FolderTree />);
    expect(screen.getByTitle('New root folder')).toBeInTheDocument();
    expect(screen.getByTitle('New page (in Home)')).toBeInTheDocument();
    expect(screen.getByTitle('New standalone task')).toBeInTheDocument();
  });
});
