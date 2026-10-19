import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationToggle from '../NotificationToggle';

const SUBSCRIPTION = {
  endpoint: 'https://push.example.com/device-endpoint',
  unsubscribe: jest.fn(),
};

function mockServiceWorker(subscription: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: () => Promise.resolve(subscription),
        },
      }),
    },
  });
}

describe('NotificationToggle', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceWorker(SUBSCRIPTION);

    fetchMock = jest.fn((url: string) => {
      if (url === '/api/push/subscribe') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ subscribed: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('shows the test notification button once notifications are enabled', async () => {
    render(<NotificationToggle />);

    const button = await screen.findByRole('button', { name: /send test notification/i });
    expect(button).toBeInTheDocument();
  });

  it('sends a test notification for this device subscription', async () => {
    render(<NotificationToggle />);

    const button = await screen.findByRole('button', { name: /send test notification/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/push/test-notification',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const [, options] = fetchMock.mock.calls.find((call) => call[0] === '/api/push/test-notification')!;
    expect(JSON.parse((options as RequestInit & { body: string }).body)).toEqual({
      endpoint: SUBSCRIPTION.endpoint,
    });

    expect(await screen.findByText(/test notification sent/i)).toBeInTheDocument();
  });

  it('surfaces an error when the test notification fails', async () => {
    fetchMock = jest.fn((url: string) => {
      if (url === '/api/push/subscribe') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ subscribed: true }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Subscription not found' }),
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<NotificationToggle />);

    const button = await screen.findByRole('button', { name: /send test notification/i });
    fireEvent.click(button);

    expect(await screen.findByText('Subscription not found')).toBeInTheDocument();
  });
});
