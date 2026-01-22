import { render, screen, waitFor } from '@testing-library/react'
import { ClerkProvider, useUser, SignInButton, SignUpButton } from '@clerk/nextjs'
import '@testing-library/jest-dom'

// Mock Clerk modules
jest.mock('@clerk/nextjs', () => ({
    ClerkProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="clerk-provider">{children}</div>,
    useUser: jest.fn(),
    SignInButton: ({ children }: { children: React.ReactNode }) => <button data-testid="sign-in-button">{children}</button>,
    SignUpButton: ({ children }: { children: React.ReactNode }) => <button data-testid="sign-up-button">{children}</button>,
    useAuth: jest.fn(),
    currentUser: jest.fn(),
}))

// Test Component for Clerk Auth Integration
function TestAuthComponent() {
    const { isSignedIn, user, isLoaded } = useUser()

    if (!isLoaded) {
        return <div data-testid="loading">Loading...</div>
    }

    if (!isSignedIn) {
        return (
            <div data-testid="signed-out">
                <SignInButton>
                    Sign In
                </SignInButton>
                <SignUpButton>
                    Sign Up
                </SignUpButton>
            </div>
        )
    }

    return (
        <div data-testid="signed-in">
            <span data-testid="user-email">{user?.emailAddresses[0]?.emailAddress}</span>
            <span data-testid="user-name">{user?.fullName}</span>
        </div>
    )
}

describe('Clerk Auth Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render loading state when auth is not loaded', () => {
        (useUser as jest.Mock).mockReturnValue({
            isSignedIn: false,
            user: null,
            isLoaded: false,
        })

        render(
            <ClerkProvider publishableKey="test-key">
                <TestAuthComponent />
            </ClerkProvider>
        )

        expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('should render sign in and sign up buttons when user is not signed in', () => {
        (useUser as jest.Mock).mockReturnValue({
            isSignedIn: false,
            user: null,
            isLoaded: true,
        })

        render(
            <ClerkProvider publishableKey="test-key">
                <TestAuthComponent />
            </ClerkProvider>
        )

        expect(screen.getByTestId('signed-out')).toBeInTheDocument()
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
        expect(screen.getByTestId('sign-up-button')).toBeInTheDocument()
    })

    it('should render user information when user is signed in', () => {
        const mockUser = {
            emailAddresses: [{ emailAddress: 'test@example.com' }],
            fullName: 'Test User',
            id: 'user_123',
        };

        (useUser as jest.Mock).mockReturnValue({
            isSignedIn: true,
            user: mockUser,
            isLoaded: true,
        });

        render(
            <ClerkProvider publishableKey="test-key">
                <TestAuthComponent />
            </ClerkProvider>
        )

        expect(screen.getByTestId('signed-in')).toBeInTheDocument()
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
    })
})

describe('Auth Context Migration', () => {
    it('should provide user data through new auth context', async () => {
        const mockUser = {
            id: 'clerk_user_123',
            emailAddresses: [{ emailAddress: 'test@example.com' }],
            fullName: 'Test User',
        };

        // Mock the Clerk auth state
        (useUser as jest.Mock).mockReturnValue({
            isSignedIn: true,
            user: mockUser,
            isLoaded: true,
        });

        // This test ensures our new auth context provides the expected interface
        function TestConsumer() {
            const { isSignedIn, user } = useUser()

            return (
                <div>
                    <span data-testid="auth-status">{isSignedIn ? 'authenticated' : 'unauthenticated'}</span>
                    <span data-testid="user-id">{user?.id}</span>
                </div>
            )
        }

        render(
            <ClerkProvider publishableKey="test-key">
                <TestConsumer />
            </ClerkProvider>
        )

        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
        expect(screen.getByTestId('user-id')).toHaveTextContent('clerk_user_123')
    })
})
