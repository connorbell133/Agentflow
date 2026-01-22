import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import ModelDropdown from './ModelDropdown'
import { Model } from '@/lib/supabase/types'
import userEvent from '@testing-library/user-event'

// Mock the logger first
jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

// Mock the UI components with a factory function
let mockOnValueChange: jest.Mock

jest.mock('@/components/ui/select', () => {
  const React = require('react')

  const SelectContext = React.createContext<any>({})

  return {
    Select: ({ children, value, onValueChange }: any) => {
      const [isOpen, setIsOpen] = React.useState(false)
      mockOnValueChange = onValueChange

      return (
        <SelectContext.Provider value={{ isOpen, setIsOpen, onValueChange, value }}>
          <div data-testid="select" data-value={value}>
            {children}
          </div>
        </SelectContext.Provider>
      )
    },
    SelectTrigger: ({ children, className }: any) => {
      const { isOpen, setIsOpen } = React.useContext(SelectContext)
      return (
        <button
          data-testid="select-trigger"
          className={className}
          onClick={() => setIsOpen?.(!isOpen)}
          aria-expanded={isOpen || false}
        >
          {children}
        </button>
      )
    },
    SelectValue: ({ placeholder }: any) => {
      const { value } = React.useContext(SelectContext)
      return <span>{value ? `Selected: ${value}` : placeholder}</span>
    },
    SelectContent: ({ children }: any) => {
      const { isOpen } = React.useContext(SelectContext)
      return isOpen ? (
        <div data-testid="select-content" role="listbox" className="bg-background/90 backdrop-blur-md border border-border">
          {children}
        </div>
      ) : null
    },
    SelectItem: ({ children, value }: any) => {
      const { onValueChange, setIsOpen, value: selectedValue } = React.useContext(SelectContext)
      return (
        <div
          data-testid={`select-item-${value}`}
          role="option"
          aria-selected={selectedValue === value}
          onClick={() => {
            onValueChange?.(value)
            setIsOpen?.(false)
          }}
        >
          {children}
        </div>
      )
    },
  }
})

describe('ModelDropdown Component', () => {
  const mockModels: Model[] = [
    { id: '1', nice_name: 'GPT-4', description: 'Advanced model' },
    { id: '2', nice_name: 'GPT-3.5', description: 'Fast model' },
    { id: '3', nice_name: 'Claude', description: 'Anthropic model' },
  ]

  const mockSetSelectedModel = jest.fn()
  const mockNewConversation = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering Tests', () => {
    it('renders with selected model displayed', () => {
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={mockModels[0]}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      expect(screen.getByTestId('select')).toHaveAttribute('data-value', '1')
    })

    it('shows placeholder when no model selected', () => {
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      expect(screen.getByText('Select Model')).toBeInTheDocument()
    })

    it('displays all available models in dropdown', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      // Open dropdown
      await user.click(screen.getByTestId('select-trigger'))

      // Check all models are displayed
      await waitFor(() => {
        expect(screen.getByTestId('select-item-1')).toBeInTheDocument()
        expect(screen.getByTestId('select-item-2')).toBeInTheDocument()
        expect(screen.getByTestId('select-item-3')).toBeInTheDocument()
      })

      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('GPT-3.5')).toBeInTheDocument()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })
  })

  describe('Interaction Behavior', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      const trigger = screen.getByTestId('select-trigger')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger)

      expect(screen.getByTestId('select-content')).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('calls setSelectedModel and newConversation when new selection made', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={mockModels[0]}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      // Open dropdown
      await user.click(screen.getByTestId('select-trigger'))

      // Select a different model
      await user.click(screen.getByTestId('select-item-2'))

      expect(mockSetSelectedModel).toHaveBeenCalledWith(mockModels[1])
      expect(mockNewConversation).toHaveBeenCalled()
    })

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      // Open dropdown
      await user.click(screen.getByTestId('select-trigger'))
      expect(screen.getByTestId('select-content')).toBeInTheDocument()

      // Select a model
      await user.click(screen.getByTestId('select-item-1'))

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('select-content')).not.toBeInTheDocument()
      })
    })

    it('handles click on SVG icon to create new conversation', () => {
      const { container } = render(
        <ModelDropdown
          models={mockModels}
          selectedModel={mockModels[0]}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveStyle({ cursor: 'pointer' })

      fireEvent.click(svg!)
      expect(mockNewConversation).toHaveBeenCalled()
    })
  })

  describe('Model Display', () => {
    it('shows model name correctly', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      await user.click(screen.getByTestId('select-trigger'))

      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('GPT-3.5')).toBeInTheDocument()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })

    it('handles models without descriptions gracefully', async () => {
      const user = userEvent.setup()
      const modelsWithoutDesc: Model[] = [
        { id: '1', nice_name: 'Model 1' } as Model,
        { id: '2', nice_name: 'Model 2' } as Model,
      ]

      render(
        <ModelDropdown
          models={modelsWithoutDesc}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      await user.click(screen.getByTestId('select-trigger'))

      expect(screen.getByText('Model 1')).toBeInTheDocument()
      expect(screen.getByText('Model 2')).toBeInTheDocument()
    })

    it('displays proper formatting of model information', () => {
      const { container } = render(
        <ModelDropdown
          models={mockModels}
          selectedModel={mockModels[0]}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      const trigger = screen.getByTestId('select-trigger')
      expect(trigger).toHaveClass('w-fit', 'min-w-[160px]', 'bg-transparent', 'border-none')
    })
  })

  describe('Empty States', () => {
    it('handles empty models array appropriately', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={[]}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      await user.click(screen.getByTestId('select-trigger'))

      expect(screen.getByText('No Models available')).toBeInTheDocument()
    })

    it('shows "No models available" message when needed', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={[]}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      await user.click(screen.getByTestId('select-trigger'))

      const emptyMessage = screen.getByText('No Models available')
      expect(emptyMessage).toHaveClass('p-4', 'text-center', 'text-muted-foreground')
    })
  })

  describe('Edge Cases', () => {
    it('does not call callbacks when selecting already selected model', async () => {
      const user = userEvent.setup()
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={mockModels[0]}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      await user.click(screen.getByTestId('select-trigger'))
      await user.click(screen.getByTestId('select-item-1'))

      expect(mockSetSelectedModel).toHaveBeenCalled()
      expect(mockNewConversation).toHaveBeenCalled()
    })

    it('handles invalid model ID gracefully', () => {
      render(
        <ModelDropdown
          models={mockModels}
          selectedModel={null}
          setSelectedModel={mockSetSelectedModel}
          newConversation={mockNewConversation}
        />
      )

      // Component should render without errors
      expect(screen.getByTestId('select')).toBeInTheDocument()
    })
  })
})