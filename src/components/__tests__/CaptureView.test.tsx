import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CaptureView from '../v2/CaptureView';

/**
 * Mobile capture page — a single text field that turns raw text into a plain
 * Inbox task through the existing authenticated `POST /api/v2/tasks` route.
 */

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (header: string) =>
        header.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

const CREATED_TASK = {
  id: 42,
  content: 'Call the dentist',
  status: 'todo',
  due_date: null,
  created_at: '2026-10-19T12:00:00.000Z',
  updated_at: '2026-10-19T12:00:00.000Z',
};

function getTextarea(): HTMLTextAreaElement {
  return screen.getByLabelText(/capture a thought/i) as HTMLTextAreaElement;
}

describe('CaptureView', () => {
  let fetchMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn(async () => mockResponse(201, CREATED_TASK));
    global.fetch = fetchMock as unknown as typeof fetch;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders a single prominent field, a Capture action, and a link to the Inbox', () => {
    render(<CaptureView />);

    expect(getTextarea()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^capture$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open inbox/i })).toHaveAttribute('href', '/inbox');
  });

  it('focuses the field so the keyboard is ready immediately', () => {
    render(<CaptureView />);

    expect(getTextarea()).toHaveFocus();
  });

  it('does not call the API when the field is empty', async () => {
    render(<CaptureView />);

    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/type something first/i);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the API when the field only contains whitespace', async () => {
    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a plain Inbox task, clears the field, and confirms', async () => {
    const created = jest.fn();
    window.addEventListener('taskCreated', created);

    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/captured to your inbox/i);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v2/tasks');
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'Call the dentist' }),
      })
    );

    // Field is reset and focused again for the next thought.
    expect(getTextarea().value).toBe('');
    expect(getTextarea()).toHaveFocus();

    // Other views are told to refresh.
    expect(created).toHaveBeenCalledTimes(1);
    expect((created.mock.calls[0][0] as CustomEvent).detail).toEqual(
      expect.objectContaining({ source: 'captureView', task: CREATED_TASK })
    );

    window.removeEventListener('taskCreated', created);
  });

  it('trims surrounding whitespace before creating the task', async () => {
    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: '  Buy milk  ' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ content: 'Buy milk' });
  });

  it('keeps the text and shows an actionable error when the API fails', async () => {
    fetchMock = jest.fn(async () => mockResponse(500, { error: 'Internal Server Error' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/your text is still here/i);
    });

    // Nothing was lost — the text is still in the field.
    expect(getTextarea().value).toBe('Call the dentist');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('signals an expired session and does not announce a created task on 401', async () => {
    fetchMock = jest.fn(async () => mockResponse(401, { error: 'Unauthorized' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const authExpired = jest.fn();
    const created = jest.fn();
    window.addEventListener('auth:expired', authExpired);
    window.addEventListener('taskCreated', created);

    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(authExpired).toHaveBeenCalled();
    });

    expect(created).not.toHaveBeenCalled();
    expect(getTextarea().value).toBe('Call the dentist');
    expect(screen.getByRole('alert')).toHaveTextContent(/session expired/i);

    window.removeEventListener('auth:expired', authExpired);
    window.removeEventListener('taskCreated', created);
  });

  it('clears the confirmation once the next thought starts typing', async () => {
    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    fireEvent.change(getTextarea(), { target: { value: 'Another thought' } });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('captures with Ctrl+Enter without inserting a newline', async () => {
    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.keyDown(getTextarea(), { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('disables the Capture action while the request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CaptureView />);

    fireEvent.change(getTextarea(), { target: { value: 'Call the dentist' } });
    fireEvent.click(screen.getByRole('button', { name: /^capture$/i }));

    const button = await screen.findByRole('button', { name: /capturing/i });
    expect(button).toBeDisabled();

    resolveFetch(mockResponse(201, CREATED_TASK));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
