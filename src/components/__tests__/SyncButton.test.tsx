import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SyncButton } from '../SyncButton'
import { useRouter } from 'next/navigation'

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('SyncButton', () => {
  const mockRefresh = jest.fn()

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      refresh: mockRefresh,
    })
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<SyncButton />)
    const button = screen.getByRole('button', { name: /sync with caldav/i })
    expect(button).toBeInTheDocument()
  })

  it('calls sync api when clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' }),
    })

    render(<SyncButton />)
    const button = screen.getByRole('button', { name: /sync with caldav/i })
    
    fireEvent.click(button)
    
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/caldav/sync', { method: 'POST' })
    })
    
    await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
