import { useEffect, useRef, useState } from 'react';
import useModalAccessibility from 'components/ux/modal/useModalAccessibility';
import { networkAdapter } from 'services/NetworkAdapter';

const INITIAL_PROMPT = 'Ask me about experiences, dates, and availability.';

const ChatSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const messagesEndRef = useRef(null);

  useModalAccessibility({
    isOpen,
    onClose: () => setIsOpen(false),
    dialogRef,
  });

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isSending]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: 'user', content }];
    while (nextMessages.length > 15) nextMessages.splice(0, 2);
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await networkAdapter.post('/api/chat', {
        messages: nextMessages,
      });
      if (response?.errors?.length || !response?.data?.message) {
        setMessages(messages);
        setInput(content);
        setError(response?.errors?.[0] || 'The assistant could not respond. Please try again.');
        return;
      }
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response.data.message },
      ]);
    } catch (_requestError) {
      setMessages(messages);
      setInput(content);
      setError('The assistant could not respond. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setError('');
    setInput('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open chat assistant"
        aria-expanded={isOpen}
        aria-controls="site-chat-sidebar"
        className="fixed bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] right-[max(1.5rem,env(safe-area-inset-right))] z-[10000] flex min-h-12 items-center gap-2 rounded-full bg-sky-800 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-900 focus-visible:outline"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-9 9 3.2-3.2A9 9 0 1 1 21 12a9 9 0 0 1-13.8 5.8L4 21Z" />
        </svg>
        Ask us
      </button>

      {isOpen && (
        <section
          id="site-chat-sidebar"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-chat-title"
          tabIndex={-1}
          className="fixed inset-0 z-[10001] flex min-h-0 flex-col bg-white shadow-2xl sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(42rem,calc(100dvh-8rem))] sm:w-[min(25rem,calc(100vw-2rem))] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-sky-900 px-4 py-3 text-white">
            <div>
              <h2 id="site-chat-title" className="text-base font-semibold">Puerto Vallarta Today</h2>
              <p className="text-xs text-sky-100">Experience assistant</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-lg px-3 text-sm text-sky-100 hover:bg-sky-800 hover:text-white"
                aria-label="Start a new chat"
              >
                New chat
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-xl leading-none hover:bg-sky-800"
                aria-label="Close chat assistant"
              >
                Close
              </button>
            </div>
          </header>

          <div
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4"
          >
            {messages.length === 0 && (
              <p className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white p-3 text-sm text-slate-700 shadow-sm">
                {INITIAL_PROMPT}
              </p>
            )}
            {messages.map((message, index) => (
              <p
                key={`${index}-${message.role}`}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl p-3 text-sm ${
                  message.role === 'user'
                    ? 'self-end rounded-br-sm bg-sky-800 text-white'
                    : 'self-start rounded-bl-sm bg-white text-slate-700 shadow-sm'
                }`}
              >
                {message.content}
              </p>
            ))}
            {isSending && (
              <p role="status" className="self-start rounded-2xl bg-white p-3 text-sm text-slate-500 shadow-sm">
                Thinking...
              </p>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
            <label className="sr-only" htmlFor="site-chat-input">Message the experience assistant</label>
            <textarea
              id="site-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1200}
              rows={2}
              placeholder="Ask about experiences..."
              disabled={isSending}
              className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="min-h-11 rounded-xl bg-sky-800 px-4 text-sm font-semibold text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <p className="bg-white px-4 pb-3 text-xs text-slate-500">
            Messages are sent to OpenAI to generate replies. Chat can help find experiences, but bookings are completed on the site.
          </p>
        </section>
      )}
    </>
  );
};

export default ChatSidebar;
