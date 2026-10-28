import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ChatSidebar from './ChatSidebar';
import { networkAdapter } from 'services/NetworkAdapter';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { post: vi.fn() },
}));

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('sends a message and displays the assistant reply', async () => {
    networkAdapter.post.mockResolvedValue({
      errors: [],
      data: { message: 'I can help you find an experience.' },
    });

    render(<ChatSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open chat assistant' }));
    fireEvent.change(screen.getByLabelText('Message the experience assistant'), {
      target: { value: 'Find me a boat tour' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(networkAdapter.post).toHaveBeenCalledWith('/api/chat', {
        messages: [{ role: 'user', content: 'Find me a boat tour' }],
      });
    });
    expect(await screen.findByText('I can help you find an experience.')).toBeInTheDocument();
  });

  test('shows backend errors and allows the user to start a new conversation', async () => {
    networkAdapter.post.mockResolvedValue({
      errors: ['Chat is not configured. Please try again later.'],
      data: {},
    });

    render(<ChatSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open chat assistant' }));
    fireEvent.change(screen.getByLabelText('Message the experience assistant'), {
      target: { value: 'What can I do in town?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Chat is not configured');
    expect(screen.getByLabelText('Message the experience assistant')).toHaveValue('What can I do in town?');
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));
    expect(screen.getByLabelText('Message the experience assistant')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('allows retrying a failed message without corrupting conversation history', async () => {
    networkAdapter.post
      .mockResolvedValueOnce({ errors: ['The chat assistant is temporarily unavailable.'], data: {} })
      .mockResolvedValueOnce({ errors: [], data: { message: 'A boat tour is available.' } });

    render(<ChatSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open chat assistant' }));
    const input = screen.getByLabelText('Message the experience assistant');
    fireEvent.change(input, { target: { value: 'Find me a boat tour' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('A boat tour is available.')).toBeInTheDocument();
    expect(networkAdapter.post.mock.calls[1][1].messages).toEqual([
      { role: 'user', content: 'Find me a boat tour' },
    ]);
  });

  test('keeps bounded conversation history starting with a user message', async () => {
    const replies = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    networkAdapter.post.mockImplementation(async () => ({
      errors: [],
      data: { message: `Reply ${replies[networkAdapter.post.mock.calls.length - 1]}` },
    }));

    render(<ChatSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open chat assistant' }));
    const input = screen.getByLabelText('Message the experience assistant');

    for (let turn = 1; turn <= 8; turn += 1) {
      fireEvent.change(input, { target: { value: `Question ${turn}` } });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
      await screen.findByText(`Reply ${replies[turn - 1]}`);
    }

    const lastRequest = networkAdapter.post.mock.calls.at(-1);
    expect(lastRequest[1].messages).toHaveLength(15);
    expect(lastRequest[1].messages[0].role).toBe('user');
    expect(lastRequest[1].messages.at(-1)).toEqual({ role: 'user', content: 'Question 8' });
  });
});
