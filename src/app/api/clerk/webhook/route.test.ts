import { POST } from './route'
import { Webhook } from 'svix'

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key: string) => {
      const mockHeaders: Record<string, string> = {
        'svix-id': 'test-id',
        'svix-timestamp': '1234567890',
        'svix-signature': 'test-signature'
      }
      return mockHeaders[key]
    })
  }))
}))

// Mock Svix Webhook
jest.mock('svix', () => ({
  Webhook: jest.fn()
}))

// Mock database and logger
jest.mock('@/db/connection', () => ({
  db: {
    insert: jest.fn(() => ({ values: jest.fn() })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn()
      }))
    })),
    delete: jest.fn(() => ({ where: jest.fn() }))
  }
}))

jest.mock('@/actions/auth/profile-sync', () => ({
  syncProfileFromClerk: jest.fn(() => Promise.resolve({ success: true, created: true }))
}))

jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn()
  }))
}))

describe('Clerk Webhook Route', () => {
  const mockWebhookVerify = jest.fn()
  const originalEnv = process.env

  const createMockRequest = (body: any = { test: 'data' }) => {
    const mockRequest = {
      text: jest.fn(() => Promise.resolve(JSON.stringify(body)))
    } as unknown as Request
    return mockRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    ;(Webhook as jest.Mock).mockImplementation(() => ({
      verify: mockWebhookVerify
    }))
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Security: Webhook Secret Validation', () => {
    it('should return 500 error when CLERK_WEBHOOK_SECRET is not configured', async () => {
      // Remove the webhook secret from environment
      delete process.env.CLERK_WEBHOOK_SECRET

      const mockRequest = createMockRequest()

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
      // Verify webhook was not instantiated due to missing secret
      expect(Webhook).not.toHaveBeenCalled()
    })

    it('should return 500 error when CLERK_WEBHOOK_SECRET is empty string', async () => {
      // Set webhook secret to empty string
      process.env.CLERK_WEBHOOK_SECRET = ''

      const mockRequest = createMockRequest()

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
      // Verify webhook was not instantiated due to empty secret
      expect(Webhook).not.toHaveBeenCalled()
    })

    it('should proceed with webhook verification when CLERK_WEBHOOK_SECRET is properly configured', async () => {
      // Set a valid webhook secret
      process.env.CLERK_WEBHOOK_SECRET = 'whsec_test123456789'

      // Mock successful webhook verification
      mockWebhookVerify.mockReturnValue({
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          image_url: 'https://example.com/image.jpg'
        }
      })

      const mockRequest = createMockRequest()

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(Webhook).toHaveBeenCalledWith('whsec_test123456789')
      expect(mockWebhookVerify).toHaveBeenCalled()
    })

    it('should return 400 error when webhook signature verification fails', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'whsec_test123456789'

      // Mock webhook verification failure
      mockWebhookVerify.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const mockRequest = createMockRequest()

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      // Verify webhook was instantiated but verification failed
      expect(Webhook).toHaveBeenCalledWith('whsec_test123456789')
    })
  })

  describe('Missing Headers Validation', () => {
    it('should return 400 error when svix headers are missing', async () => {
      // Mock missing headers
      jest.resetModules()
      jest.doMock('next/headers', () => ({
        headers: jest.fn(() => ({
          get: jest.fn(() => null)
        }))
      }))

      const { POST: POSTWithMissingHeaders } = await import('./route')

      const mockRequest = createMockRequest()

      const response = await POSTWithMissingHeaders(mockRequest)

      expect(response.status).toBe(400)
      // Response should indicate missing svix headers
    })
  })
})