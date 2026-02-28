import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ChatPanel from '../../../components/ChatPanel';

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const [dream, setDream] = useState('');

  useEffect(() => {
    const idea = searchParams.get('idea');
    if (idea) {
      setDream(decodeURIComponent(idea));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-gray-900">
                LLM-Tests
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to={`/dashboard${dream ? `?idea=${encodeURIComponent(dream)}` : ''}`}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {dream && (
                <span className="text-sm text-gray-500 truncate max-w-xs">
                  Building: {dream.substring(0, 50)}{dream.length > 50 ? '...' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat with Paige
          </h1>
          <p className="text-gray-600">
            {dream 
              ? `Discussing your idea: "${dream}"`
              : "Describe what you want to build and I'll help you get started!"}
          </p>
        </div>

        {/* Chat Panel */}
        <div className="h-[calc(100vh-280px)] min-h-[500px]">
          <ChatPanel dreamContext={dream} />
        </div>

        {/* Helpful Tips */}
        <div className="mt-12 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span>💡</span> Tip
            </h3>
            <p className="text-blue-800 text-sm">
              Be specific about what you want to build. Include details like features, target users, and timeline.
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <span>🎯</span> Goal
            </h3>
            <p className="text-purple-800 text-sm">
              Paige will help you break down your project into actionable steps and guide you through the process.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
