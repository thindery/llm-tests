import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ChatPanel from '../../components/ChatPanel';

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const [dream, setDream] = useState('');
  const [showChat, setShowChat] = useState(false);

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
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                LLM-Tests
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/chat"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Start Chat
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome! This is your building workspace. {dream ? "Your idea is ready to go!" : "Start building something amazing."}
          </p>
        </div>

        {/* Dream Display */}
        {dream && (
          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
              <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">
                Your Idea
              </h2>
              <p className="text-2xl font-medium text-gray-900 leading-relaxed">
                "{dream}"
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  to={`/dashboard/chat?idea=${encodeURIComponent(dream)}`}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Building with Paige
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {showChat ? 'Hide Chat' : 'Quick Chat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Chat Panel */}
        {showChat && (
          <div className="max-w-4xl mx-auto mb-12">
            <ChatPanel dreamContext={dream} />
          </div>
        )}

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chat with Paige
            </h3>
            <p className="text-gray-600 mb-4">
              Get guidance and help from Paige AI to bring your ideas to life.
            </p>
            <Link
              to={`/dashboard/chat${dream ? `?idea=${encodeURIComponent(dream)}` : ''}`}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Start chatting →
            </Link>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏗️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Build Projects
            </h3>
            <p className="text-gray-600 mb-4">
              Create and manage your projects with ease.
            </p>
            <span className="text-gray-400 font-medium">
              Coming soon
            </span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Track Progress
            </h3>
            <p className="text-gray-600 mb-4">
              Monitor your building progress and achievements.
            </p>
            <span className="text-gray-400 font-medium">
              Coming soon
            </span>
          </div>
        </div>

        {/* Empty State */}
        {!dream && (
          <div className="text-center mt-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No idea yet?
              </h3>
              <p className="text-gray-600 mb-6">
                Go back to the landing page and share what you'd like to build.
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
