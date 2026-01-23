import { render, screen, waitFor } from '@testing-library/react';
import { ProfileCompletionProvider } from '@/providers/ProfileCompletionProvider';
import { useUser } from '@/hooks/auth/use-user';
import { usePathname, useRouter } from 'next/navigation';
import * as profileActions from '@/actions/auth/profile';

// Mock Better-Auth user hook
jest.mock('@/hooks/auth/use-user', () => ({
  useUser: jest.fn(),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock profile actions
jest.mock('@/actions/auth/profile', () => ({
  getProfile: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('ProfileCompletionProvider', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush } as any);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('should render children when user has complete profile', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        signupComplete: true,
      },
    } as any);

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect to onboarding when profile is missing', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-456', email: 'new@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: null,
    } as any);

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('should redirect when profile exists but signup not complete', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-789', email: 'incomplete@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'user-789',
        email: 'incomplete@example.com',
        fullName: 'Incomplete User',
        signupComplete: false,
      },
    } as any);

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('re-checks profile for same user after onboarding flow completes', async () => {
    let currentPath = '/dashboard';

    (usePathname as jest.Mock).mockImplementation(() => currentPath);
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        data: null,
      } as any)
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'user-123', signup_complete: true },
      } as any);

    const { rerender } = render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });

    currentPath = '/';
    rerender(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(profileActions.getProfile).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  it('should skip check for excluded paths', async () => {
    (usePathname as jest.Mock).mockReturnValue('/sign-in');
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isUserLoaded: true,
    } as any);

    render(
      <ProfileCompletionProvider>
        <div>Sign In Page</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    });

    expect(profileActions.getProfile).not.toHaveBeenCalled();
  });

  it('should show loading state while checking', () => {
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    expect(screen.getByText('Verifying your profile...')).toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-error', email: 'error@example.com' },
      isUserLoaded: true,
    } as any);

    (profileActions.getProfile as jest.Mock).mockRejectedValue(new Error('Database error'));

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not check when user is not loaded', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isUserLoaded: false,
    } as any);

    render(
      <ProfileCompletionProvider>
        <div>Dashboard Content</div>
      </ProfileCompletionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    expect(profileActions.getProfile).not.toHaveBeenCalled();
  });
});
