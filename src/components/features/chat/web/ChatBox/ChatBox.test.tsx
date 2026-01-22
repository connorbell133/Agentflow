import React from 'react';
import { render, screen } from '@/test-utils';
import ChatBox from './ChatBox';
import { Message } from '@/lib/supabase/types';

// Mock the dependencies
jest.mock('@/components/features/chat/shared/content/MarkdownContent/MarkdownContent', () => ({
  __esModule: true,
  default: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}));

jest.mock('@/components/shared/loading/TypingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="typing-indicator">Loading...</div>,
}));

describe('ChatBox Component', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Hello!',
      role: 'user',
      conversationId: 'conv-1',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      content: 'Hi there! How can I help you?',
      role: 'assistant',
      conversationId: 'conv-1',
      created_at: new Date().toISOString(),
    },
  ];

  describe('Rendering States', () => {
    it('renders empty state when no messages', () => {
      const { container } = render(<ChatBox messages={[]} isLoading={false} />);

      // Check for SVG icon by container query
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Check for empty state text
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(
        screen.getByText('Start a conversation by sending your first message below.')
      ).toBeInTheDocument();
    });

    it('renders messages correctly with proper content', () => {
      render(<ChatBox messages={mockMessages} isLoading={false} />);

      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument();

      // Empty state should not be visible
      expect(screen.queryByText('No messages yet')).not.toBeInTheDocument();
    });

    it('displays loading indicator when isLoading is true', () => {
      render(<ChatBox messages={[]} isLoading={true} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows both messages and loading indicator when loading with messages', () => {
      render(<ChatBox messages={mockMessages} isLoading={true} />);

      // Messages should be visible
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument();

      // Loading indicator should also be visible
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('applies user message styling correctly', () => {
      const userMessage: Message[] = [
        {
          id: '1',
          content: 'User message',
          role: 'user',
          conversationId: 'conv-1',
          created_at: new Date().toISOString(),
        },
      ];

      const { container } = render(<ChatBox messages={userMessage} isLoading={false} />);

      const messageWrapper = container.querySelector('.justify-end');
      expect(messageWrapper).toBeInTheDocument();

      const messageContent = container.querySelector('.bg-primary\\/20');
      expect(messageContent).toBeInTheDocument();
      expect(messageContent).toHaveClass('text-right');
    });

    it('applies assistant message styling correctly', () => {
      const assistantMessage: Message[] = [
        {
          id: '1',
          content: 'Assistant message',
          role: 'assistant',
          conversationId: 'conv-1',
          created_at: new Date().toISOString(),
        },
      ];

      const { container } = render(<ChatBox messages={assistantMessage} isLoading={false} />);

      const messageWrapper = container.querySelector('.justify-start');
      expect(messageWrapper).toBeInTheDocument();

      const messageContent = container.querySelector('.text-left');
      expect(messageContent).toBeInTheDocument();
    });

    it('applies proper role-based styling for multiple messages', () => {
      const { container } = render(<ChatBox messages={mockMessages} isLoading={false} />);

      const justifyEndElements = container.querySelectorAll('.justify-end');
      const justifyStartElements = container.querySelectorAll('.justify-start');

      expect(justifyEndElements).toHaveLength(1); // 1 user message
      expect(justifyStartElements).toHaveLength(1); // 1 assistant message
    });
  });

  describe('Memoization Behavior', () => {
    it('does not re-render when props remain unchanged', () => {
      const { rerender } = render(<ChatBox messages={mockMessages} isLoading={false} />);

      // Mock React.memo by checking if content is still there after rerender
      const initialContent = screen.getByText('Hello!');

      rerender(<ChatBox messages={mockMessages} isLoading={false} />);

      expect(screen.getByText('Hello!')).toBe(initialContent);
    });

    it('re-renders when messages change', () => {
      const { rerender } = render(<ChatBox messages={mockMessages} isLoading={false} />);

      const newMessages: Message[] = [
        ...mockMessages,
        {
          id: '3',
          content: 'New message',
          role: 'user',
          conversationId: 'conv-1',
          created_at: new Date().toISOString(),
        },
      ];

      rerender(<ChatBox messages={newMessages} isLoading={false} />);

      expect(screen.getByText('New message')).toBeInTheDocument();
    });

    it('re-renders when loading state changes', () => {
      const { rerender } = render(<ChatBox messages={mockMessages} isLoading={false} />);

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();

      rerender(<ChatBox messages={mockMessages} isLoading={true} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });

  describe('MessageItem Sub-component', () => {
    it('renders markdown content correctly', () => {
      const markdownMessage: Message[] = [
        {
          id: '1',
          content: '**Bold** and *italic* text',
          role: 'assistant',
          conversationId: 'conv-1',
          created_at: new Date().toISOString(),
        },
      ];

      render(<ChatBox messages={markdownMessage} isLoading={false} />);

      // Since we mocked MarkdownContent, it just renders the raw markdown
      expect(screen.getByText('**Bold** and *italic* text')).toBeInTheDocument();
    });

    it('handles null/undefined content gracefully', () => {
      const nullContentMessage: Message[] = [
        {
          id: '1',
          content: null as any,
          role: 'user',
          conversationId: 'conv-1',
          created_at: new Date().toISOString(),
        },
      ];

      const { container } = render(<ChatBox messages={nullContentMessage} isLoading={false} />);

      // Should render empty markdown content div
      const markdownDiv = container.querySelector('.bg-primary\\/20 div');
      expect(markdownDiv).toBeInTheDocument();
      expect(markdownDiv?.textContent).toBe('');
    });

    it('renders proper message structure', () => {
      const { container } = render(<ChatBox messages={mockMessages} isLoading={false} />);

      const messageElements = container.querySelectorAll('.my-2');
      expect(messageElements).toHaveLength(2);

      // Check for proper nesting
      messageElements.forEach(elem => {
        expect(elem.querySelector('div')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State Component', () => {
    it('renders chat bubble SVG icon with correct dimensions', () => {
      const { container } = render(<ChatBox messages={[]} isLoading={false} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    });

    it('displays proper heading with correct styling', () => {
      render(<ChatBox messages={[]} isLoading={false} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No messages yet');
      expect(heading).toHaveClass('text-lg', 'font-medium', 'text-muted-foreground');
    });

    it('shows helpful sub-text for new conversations', () => {
      render(<ChatBox messages={[]} isLoading={false} />);

      const subText = screen.getByText('Start a conversation by sending your first message below.');
      expect(subText).toHaveClass('text-sm', 'text-muted-foreground/80', 'max-w-sm');
    });
  });
});
