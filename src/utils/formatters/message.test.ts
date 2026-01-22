import {
  setNestedValue,
  getNestedValue,
  transformMessages,
  validatemessage_format_config,
  createSampleTransformedMessage
} from './message-formatting'
import { Message } from '@/lib/supabase/types'
import { message_format_config, FieldMapping, RoleMapping } from '@/types/message-format'

// Suppress console warnings in tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
})

describe('Message Formatting Utilities', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    content: 'Hello, world!',
    role: 'user',
    created_at: '2024-01-01T00:00:00Z',
    conversation_id: 'conv-123'
  }

  describe('setNestedValue', () => {
    it('sets value at single-level path', () => {
      const obj: any = {}
      setNestedValue(obj, 'name', 'John')
      expect(obj.name).toBe('John')
    })

    it('sets value at nested path', () => {
      const obj: any = {}
      setNestedValue(obj, 'user.profile.name', 'John')
      expect(obj.user.profile.name).toBe('John')
    })

    it('creates nested objects as needed', () => {
      const obj: any = { user: {} }
      setNestedValue(obj, 'user.settings.theme', 'dark')
      expect(obj.user.settings.theme).toBe('dark')
    })

    it('overwrites existing values', () => {
      const obj: any = { user: { name: 'John' } }
      setNestedValue(obj, 'user.name', 'Jane')
      expect(obj.user.name).toBe('Jane')
    })

    it('handles empty path gracefully', () => {
      const obj: any = { test: 'value' }
      setNestedValue(obj, '', 'new value')
      expect(obj.test).toBe('value') // Should not modify
      expect(console.warn).toHaveBeenCalledWith('setNestedValue: Invalid path provided:', '')
    })

    it('handles null or undefined path', () => {
      const obj: any = {}
      setNestedValue(obj, null as any, 'value')
      setNestedValue(obj, undefined as any, 'value')
      expect(obj).toEqual({})
    })

    it('handles paths with only whitespace', () => {
      const obj: any = {}
      setNestedValue(obj, '   ', 'value')
      expect(obj).toEqual({})
      expect(console.warn).toHaveBeenCalledWith('setNestedValue: Invalid path provided:', '   ')
    })
  })

  describe('getNestedValue', () => {
    it('gets value from single-level path', () => {
      const obj = { name: 'John' }
      expect(getNestedValue(obj, 'name')).toBe('John')
    })

    it('gets value from nested path', () => {
      const obj = { user: { profile: { name: 'John' } } }
      expect(getNestedValue(obj, 'user.profile.name')).toBe('John')
    })

    it('returns undefined for non-existent path', () => {
      const obj = { user: { name: 'John' } }
      expect(getNestedValue(obj, 'user.age')).toBeUndefined()
    })

    it('returns undefined for path through null/undefined', () => {
      const obj = { user: null }
      expect(getNestedValue(obj, 'user.name')).toBeUndefined()
    })

    it('handles empty path gracefully', () => {
      const obj = { test: 'value' }
      expect(getNestedValue(obj, '')).toBeUndefined()
      expect(console.warn).toHaveBeenCalledWith('getNestedValue: Invalid path provided:', '')
    })

    it('handles array access in path', () => {
      const obj = { users: [{ name: 'John' }, { name: 'Jane' }] }
      expect(getNestedValue(obj, 'users.1.name')).toBe('Jane')
    })
  })

  describe('transformMessages - Basic Transformation', () => {
    it('transforms messages according to mapping config', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role' },
          content: { source: 'content', target: 'content' }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result).toEqual([{
        role: 'user',
        content: 'Hello, world!'
      }])
    })

    it('handles nested target paths', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'message.role' },
          content: { source: 'content', target: 'message.text' }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result).toEqual([{
        message: {
          role: 'user',
          text: 'Hello, world!'
        }
      }])
    })

    it('handles literal values', () => {
      const config: message_format_config = {
        mapping: {
          type: { source: 'literal', literalValue: 'chat', target: 'type' },
          content: { source: 'content', target: 'text' }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result).toEqual([{
        type: 'chat',
        text: 'Hello, world!'
      }])
    })
  })

  describe('transformMessages - Role Mapping', () => {
    it('applies role mapping transformations', () => {
      const roleMapping: RoleMapping[] = [
        { from: 'user', to: 'human' },
        { from: 'assistant', to: 'ai' }
      ]

      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role', roleMapping }
        }
      }

      const messages: Message[] = [
        { ...mockMessage, role: 'user' },
        { ...mockMessage, role: 'assistant', id: 'msg-2' }
      ]

      const result = transformMessages(messages, config)
      expect(result[0].role).toBe('human')
      expect(result[1].role).toBe('ai')
    })

    it('preserves role when no mapping matches', () => {
      const roleMapping: RoleMapping[] = [
        { from: 'user', to: 'human' }
      ]

      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role', roleMapping }
        }
      }

      const message = { ...mockMessage, role: 'system' }
      const result = transformMessages([message], config)
      expect(result[0].role).toBe('system')
    })

    it('handles empty or invalid role mapping', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role', roleMapping: [] }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result[0].role).toBe('user')
    })
  })

  describe('transformMessages - Timestamp Transformation', () => {
    it('transforms timestamp fields to ISO format', () => {
      const config: message_format_config = {
        mapping: {
          timestamp: { source: 'created_at', target: 'timestamp', transform: 'timestamp' }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result[0].timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('throws error for invalid date strings', () => {
      const config: message_format_config = {
        mapping: {
          timestamp: { source: 'created_at', target: 'timestamp', transform: 'timestamp' }
        }
      }

      const invalidMessage = { ...mockMessage, created_at: 'invalid-date' }
      expect(() => transformMessages([invalidMessage], config)).toThrow('Invalid time value')
    })
  })

  describe('transformMessages - Custom Fields', () => {
    it('adds custom fields to transformed messages', () => {
      const config: message_format_config = {
        mapping: {
          content: { source: 'content', target: 'text' }
        },
        customFields: [
          { name: 'version', value: '1.0', type: 'string' },
          { name: 'metadata.source', value: 'chat-app', type: 'string' }
        ]
      }

      const result = transformMessages([mockMessage], config)
      expect(result[0]).toEqual({
        text: 'Hello, world!',
        version: '1.0',
        metadata: { source: 'chat-app' }
      })
    })

    it('skips invalid custom fields', () => {
      const config: message_format_config = {
        mapping: {
          content: { source: 'content', target: 'text' }
        },
        customFields: [
          { name: '', value: 'invalid' } as any,
          { name: null, value: 'invalid' } as any,
          { name: 'valid', value: 'test' }
        ]
      }

      const result = transformMessages([mockMessage], config)
      expect(result[0]).toEqual({
        text: 'Hello, world!',
        valid: 'test'
      })
    })
  })

  describe('transformMessages - Error Handling', () => {
    it('skips invalid mappings', () => {
      const config: message_format_config = {
        mapping: {
          invalid1: { source: 'content', target: '' } as any,
          invalid2: { source: 'content', target: null } as any,
          valid: { source: 'content', target: 'text' }
        }
      }

      const result = transformMessages([mockMessage], config)
      expect(result[0]).toEqual({ text: 'Hello, world!' })
      expect(console.warn).toHaveBeenCalled()
    })

    it('handles empty messages array', () => {
      const config: message_format_config = {
        mapping: { content: { source: 'content', target: 'text' } }
      }

      const result = transformMessages([], config)
      expect(result).toEqual([])
    })
  })

  describe('validateMessageFormatConfig', () => {
    it('validates preset configurations with required fields', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role' },
          content: { source: 'content', target: 'content' }
        }
      }

      const result = validatemessage_format_config(config)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('reports missing required fields', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role' }
          // Missing content mapping
        }
      }

      const result = validatemessage_format_config(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required mapping for field: content')
    })

    it('fails validation when missing required fields', () => {
      const config: message_format_config = {
        mapping: {
          text: { source: 'content', target: 'message' }
          // Missing role and content mappings
        }
      }

      const result = validatemessage_format_config(config)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('validates empty target paths', () => {
      const config: message_format_config = {
        mapping: {
          field1: { source: 'content', target: '' },
          field2: { source: 'content', target: '   ' }
        }
      }

      const result = validatemessage_format_config(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('validates literal mappings require literalValue', () => {
      const config: message_format_config = {
        mapping: {
          type: { source: 'literal', target: 'type' }
        }
      }

      const result = validatemessage_format_config(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Literal mapping for field 'type' requires a literalValue")
    })
  })

  describe('createSampleTransformedMessage', () => {
    it('creates sample with provided message data', () => {
      const config: message_format_config = {
        mapping: {
          content: { source: 'content', target: 'text' }
        }
      }

      const sample = createSampleTransformedMessage(
        { content: 'Custom content' },
        config
      )

      expect(sample).toEqual({ text: 'Custom content' })
    })

    it('uses default values for missing fields', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'role' },
          content: { source: 'content', target: 'content' }
        }
      }

      const sample = createSampleTransformedMessage({}, config)

      expect(sample.role).toBe('user')
      expect(sample.content).toBe('Hello, this is a sample message')
    })

    it('combines provided and default values', () => {
      const config: message_format_config = {
        mapping: {
          role: { source: 'role', target: 'sender' },
          id: { source: 'id', target: 'messageId' }
        }
      }

      const sample = createSampleTransformedMessage(
        { role: 'assistant' },
        config
      )

      expect(sample.sender).toBe('assistant')
      expect(sample.messageId).toBe('sample-id')
    })
  })
})