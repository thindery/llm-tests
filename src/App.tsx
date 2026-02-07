import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LLM-Tests Framework
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Competitive Model Evaluation Platform
          </p>
          <div className="card">
            <button 
              onClick={() => setCount((count) => count + 1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Count is {count}
            </button>
          </div>
          <p className="mt-8 text-sm text-gray-500">
            Initialize challenge branches to begin testing
          </p>
        </div>
      </div>
    </>
  )
}

export default App
