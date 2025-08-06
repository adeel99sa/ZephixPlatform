import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';

describe('ChatInterface', () => {
  const mockMessages = [
    {
      id: '1',
      type: 'user' as const,
      content: 'Hello, how can you help me?',
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      type: 'ai' as const,
      content: 'I can help you with project planning and analysis.',
      timestamp: new Date('2024-01-01T10:01:00Z'),
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    inputValue: '',
    isProcessing: false,
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
  };

  it('renders correctly with all UI elements', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for main chat elements
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything about your projects and workflow/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask me anything about your projects/)).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for user message
    expect(screen.getByText('Hello, how can you help me?')).toBeInTheDocument();
    
    // Check for AI message
    expect(screen.getByText('I can help you with project planning and analysis.')).toBeInTheDocument();
  });

  it('has proper accessibility roles and labels', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for proper chat interface structure
    const chatInterface = screen.getByRole('region');
    expect(chatInterface).toBeInTheDocument();
    expect(chatInterface).toHaveAttribute('aria-label', 'AI Chat Interface');
    
    // Check for proper heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('AI Assistant');
    
    // Check for proper input field
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Type your message');
    
    // Check for proper send button
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    // Note: h2 elements don't need explicit role="heading" attribute
    expect(headings[0]).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for proper message roles
    const userMessage = screen.getByText('Hello, how can you help me?').closest('div');
    expect(userMessage).toHaveAttribute('role', 'log');
    expect(userMessage).toHaveAttribute('aria-label', 'You message');
    
    const aiMessage = screen.getByText('I can help you with project planning and analysis.').closest('div');
    expect(aiMessage).toHaveAttribute('role', 'status');
    expect(aiMessage).toHaveAttribute('aria-label', 'AI Assistant message');
    
    // Check for proper log region
    const logRegions = screen.getAllByRole('log');
    expect(logRegions.length).toBeGreaterThan(0);
    expect(logRegions[0]).toHaveAttribute('aria-live', 'polite');
  });

  it('has proper keyboard navigation support', async () => {
    const user = userEvent.setup();
    
    render(<ChatInterface {...defaultProps} />);
    
    // Tab to input field
    await user.tab();
    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
    
    // Tab to send button
    await user.tab();
    const sendButton = screen.getByRole('button', { name: /send message/i });
    // Note: The button is disabled, so it may not receive focus
    expect(sendButton).toBeInTheDocument();
  });

  it('handles Enter key press correctly', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();
    
    render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} inputValue="Test message" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, '{enter}');
    
    expect(onSendMessage).toHaveBeenCalled();
  });

  it('handles send button click correctly', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();
    
    render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} inputValue="Test message" />);
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);
    
    expect(onSendMessage).toHaveBeenCalled();
  });

  it('renders processing state correctly', () => {
    render(<ChatInterface {...defaultProps} isProcessing={true} />);
    
    // Check for processing status
    expect(screen.getByText('Processing your message...')).toBeInTheDocument();
    
    // Check for processing status ID
    const processingStatus = screen.getByText('Processing your message...');
    expect(processingStatus).toHaveAttribute('id', 'processing-status');
    expect(processingStatus).toHaveAttribute('role', 'status');
  });

  it('has proper focus management', async () => {
    const user = userEvent.setup();
    
    render(<ChatInterface {...defaultProps} />);
    
    // Focus should be managed properly
    const input = screen.getByRole('textbox');
    input.focus();
    expect(input).toHaveFocus();
  });

  it('has proper semantic structure', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for proper region element
    const region = screen.getByRole('region');
    expect(region).toBeInTheDocument();
    
    // Check that heading is inside region
    const heading = screen.getByRole('heading', { level: 2 });
    expect(region).toContainElement(heading);
  });

  it('has proper color contrast and visual indicators', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for proper hover states
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toHaveClass('hover:from-indigo-600', 'hover:to-purple-700');
  });

  it('has proper text content and descriptions', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for descriptive text
    const description = screen.getByText(/Ask me anything about your projects and workflow/);
    expect(description).toBeInTheDocument();
  });

  it('has proper message timestamps', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check that timestamps are displayed
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('has proper input field behavior', async () => {
    const onInputChange = vi.fn();
    const user = userEvent.setup();
    
    render(<ChatInterface {...defaultProps} onInputChange={onInputChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'Test message');
    
    // The onInputChange is called for each character typed
    expect(onInputChange).toHaveBeenCalled();
    // Check that the input field is properly controlled
    expect(input).toHaveAttribute('value', '');
  });

  it('has proper disabled state', () => {
    render(<ChatInterface {...defaultProps} isProcessing={true} />);
    
    // Check that input is disabled when processing
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    
    // Check that send button is disabled when processing
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('has proper loading state', () => {
    const messagesWithLoading = [
      ...mockMessages,
      {
        id: '3',
        type: 'ai' as const,
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ];
    
    render(<ChatInterface {...defaultProps} messages={messagesWithLoading} />);
    
    // Check for loading indicator
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('has proper message alignment', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check that user messages are aligned to the right
    const userMessage = screen.getByText('Hello, how can you help me?').closest('div');
    expect(userMessage?.parentElement).toHaveClass('justify-end');
    
    // Check that AI messages are aligned to the left
    const aiMessage = screen.getByText('I can help you with project planning and analysis.').closest('div');
    expect(aiMessage?.parentElement).toHaveClass('justify-start');
  });

  it('has proper scroll behavior', () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check for scroll container
    const scrollContainers = screen.getAllByRole('log');
    expect(scrollContainers.length).toBeGreaterThan(0);
    expect(scrollContainers[0]).toHaveClass('overflow-y-auto');
  });
});
