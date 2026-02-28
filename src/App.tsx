import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardPage from './app/dashboard/page';
import ChatPage from './app/dashboard/chat/page';
import './App.css';

// Landing Page Component
function LandingPage() {
  const [dream, setDream] = useState('');
  const navigate = useNavigate();

  const handleStartBuilding = () => {
    if (dream.trim()) {
      // Navigate to dashboard with the idea as a query parameter
      navigate(`/dashboard?idea=${encodeURIComponent(dream.trim())}`);
    } else {
      // Navigate to dashboard without an idea
      navigate('/dashboard');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStartBuilding();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Logo / Brand */}
          <div className="mb-8">
            <span className="text-6xl mb-4 block">🚀</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Build Your Dreams with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paige
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Tell us what you want to build and our AI assistant will help you bring your ideas to life.
          </p>

          {/* Input Section */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-2 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={dream}
                  onChange={(e) => setDream(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., A mobile app for tracking my daily habits..."
                  className="flex-1 px-6 py-4 text-lg border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400"
                />
                <button
                  onClick={handleStartBuilding}
                  className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Start Building
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Helper Text */}
            <p className="mt-4 text-sm text-gray-500">
              Press Enter to start or{' '}
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 hover:underline font-medium"
              >
                skip to dashboard
              </button>
            </p>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Powered
              </h3>
              <p className="text-gray-600">
                Paige uses cutting-edge AI to understand your vision and guide you.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Conversational
              </h3>
              <p className="text-gray-600">
                Chat naturally with Paige to refine and build your ideas.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Fast & Smart
              </h3>
              <p className="text-gray-600">
                Get instant feedback and actionable steps to move forward.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>LLM-Tests Framework - Build smarter with AI</p>
        </div>
      </footer>
    </div>
  );
}

// Main App Component with Routes
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/chat" element={<ChatPage />} />
    </Routes>
  );
}

export default App;
