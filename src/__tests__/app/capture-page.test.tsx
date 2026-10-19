import { render, screen } from '@testing-library/react';
import CapturePage, { metadata } from '@/app/capture/page';

/**
 * The `/capture` route is a thin wrapper around the capture view. It lives
 * inside the normal app shell (LayoutWrapper) and, because it is not in the
 * middleware public allowlist, it requires a session cookie.
 */
describe('/capture page', () => {
  it('renders the capture surface', () => {
    render(<CapturePage />);

    expect(screen.getByRole('heading', { name: /capture/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/capture a thought/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^capture$/i })).toBeInTheDocument();
  });

  it('has its own page metadata', () => {
    expect(metadata.title).toBe('Capture | The Docket');
  });
});
