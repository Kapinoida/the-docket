import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SyncButton } from '../SyncButton'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock apiFetch
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  AuthError: class AuthError extends Error {},
}))

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
    (apiFetch as jest.Mock).mockResolvedValueOnce({ status: 'success' })

    render(<SyncButton />)
    const button = screen.getByRole('button', { name: /sync with caldav/i })
    
    fireEvent.click(button)
    
    await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith('/api/caldav/sync', { method: 'POST' })
    })
    
    await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
    })
  })
})