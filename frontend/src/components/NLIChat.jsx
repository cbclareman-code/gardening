import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';

export default function NLIChat({ gardenId, onGardenUpdate, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef();
  const inputRef = useRef();

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: gardenId
          ? "Hi! I'm your garden assistant 🌱 Tell me what you'd like to do — add plants, optimize your layout, ask about companion planting, or anything else!"
          : "Hi! I'm ChatGRD, your AI garden planner 🌱 I can help you plan your garden, answer plant questions, or suggest what to grow. What's on your mind?"
      }]);
    }
  }, [gardenId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8); // last 8 for context
      const { data } = await api.post('/nli/chat', {
        garden_id: gardenId || undefined,
        message: text,
        conversation_history: history
      });

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      // Notify parent of garden changes
      if (data.garden && onGardenUpdate) {
        onGardenUpdate(data.garden, data.plants);
      }

      // Show action summary
      if (data.actions && data.actions.length > 0) {
        const summary = data.actions
          .filter(a => a.type !== 'suggest_layout')
          .map(a => {
            if (a.type === 'add_plant') return `✅ Added ${a.plant_name}`;
            if (a.type === 'remove_plant') return `🗑️ Removed ${a.plant_name}`;
            if (a.type === 'update_garden') return `📝 Updated ${a.field}`;
            return null;
          })
          .filter(Boolean);

        if (summary.length > 0) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: summary.join(' · ')
          }]);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Could not reach Claude API. Check your ANTHROPIC_API_KEY.';
      setError(errMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = gardenId
    ? ['What plants work well together?', 'Optimize my layout', 'What can I plant in partial shade?', 'Add some herbs']
    : ['What grows well in zone 6?', 'Best vegetables for beginners', 'Container garden ideas'];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 bg-garden-600 hover:bg-garden-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-110 text-2xl"
        title="Chat with your garden assistant"
      >
        💬
      </button>
    );
  }

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/20 sm:hidden"
        onClick={onToggle}
      />

      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
        style={{ maxHeight: '80vh', height: '500px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Garden Assistant</h3>
              <p className="text-xs text-gray-500">Powered by Claude</p>
            </div>
          </div>
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'system' ? (
                <div className="text-xs text-center text-garden-700 bg-garden-50 rounded-full px-3 py-1 border border-garden-200 mx-auto">
                  {msg.content}
                </div>
              ) : (
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-garden-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => { setInput(p); inputRef.current?.focus(); }}
                className="text-xs bg-garden-50 hover:bg-garden-100 text-garden-700 border border-garden-200 rounded-full px-2.5 py-1 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your garden..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-garden-600 hover:bg-garden-700 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors"
            >
              →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
