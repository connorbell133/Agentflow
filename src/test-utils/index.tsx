import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock providers wrapper
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup()
  const result = render(ui, { wrapper: AllTheProviders, ...options })

  return {
    user,
    ...result,
  }
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { userEvent }

// Common test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  signupComplete: true,
  created_at: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  content: 'Test message',
  role: 'user',
  conversationId: 'conv-1',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockConversation = (overrides = {}) => ({
  id: 'conv-1',
  created_at: '2024-01-01T00:00:00Z',
  user: 'user-1',
  model: 'model-1',
  org_id: 'org-1',
  title: 'Test Conversation',
  ...overrides,
})

export const createMockModel = (overrides = {}) => ({
  id: 'model-1',
  nice_name: 'GPT-4',
  description: 'Advanced language model',
  ...overrides,
})