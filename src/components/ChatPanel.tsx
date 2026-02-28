import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
}

interface ChatPanelProps {
  initialMessage?: string;
  dreamContext?: string;
}

export function ChatPanel({ initialMessage, dreamContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with system context if dreamContext is provided
  useEffect(() => {
    if (dreamContext) {
      setMessages([
        {
          role: 'system',
          content: `The user wants to build: ${dreamContext}. You are Paige, a helpful AI assistant that helps users bring their ideas to life. Be encouraging and guide them through the process.`,
          id: 'system-1',
        },
      ]);
      
      // Add Paige's welcome message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Hi! I'm Paige. I see you want to build: "${dreamContext}". That sounds exciting! Let's break this down together. What would you like to start with?`,
          id: 'welcome-1',
        },
      ]);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: "Hi! I'm Paige. Tell me what you'd like to build and I'll help you bring it to life!",
          id: 'welcome-1',
        },
      ]);
    }
  }, [dreamContext]);

  // Handle initial message if provided
  useEffect(() => {
    if (initialMessage && messages.length <= (dreamContext ? 2 : 1)) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      id: `user-${Date.now()}`,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.role !== 'system'),
            userMessage,
          ].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message?.content || 'I apologize, but I am unable to respond at the moment.',
          id: `assistant-${Date.now()}`,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback response if API fails
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm here to help you build! What specific features would you like to include?",
          id: `assistant-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-white font-semibold">Paige</h2>
            <p className="text-white/80 text-sm">Your AI Building Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]">
        {messages.filter(m => m.role !== 'system').map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;
