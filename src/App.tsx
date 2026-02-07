import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Type definition for a TODO item
interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

// Constants
const LOCAL_STORAGE_KEY = 'kimi-todo-app-items'

function App() {
  // State for TODO items
  const [todos, setTodos] = useState<Todo[]>([])
  // State for input field
  const [inputValue, setInputValue] = useState('')
  // State to track if we've loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false)

  // Load TODOs from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setTodos(parsed)
      }
    } catch (error) {
      console.error('Error loading todos from localStorage:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save TODOs to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos))
      } catch (error) {
        console.error('Error saving todos to localStorage:', error)
      }
    }
  }, [todos, isLoaded])

  // Add a new TODO
  const addTodo = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    }

    setTodos(prev => [newTodo, ...prev])
    setInputValue('')
  }, [inputValue])

  // Handle Enter key press in input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }, [addTodo])

  // Toggle TODO completion status
  const toggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [])

  // Delete a TODO
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }, [])

  // Get active and completed counts
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  // Don't render until we've loaded from localStorage to avoid hydration mismatch
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            My Tasks
          </h1>
          <p className="text-slate-500">
            Stay organized and get things done
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-700 placeholder:text-slate-400"
              autoFocus
            />
            <button
              onClick={addTodo}
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Add
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{activeCount}</span> active
              {completedCount > 0 && (
                <>, <span className="font-medium text-slate-700">{completedCount}</span> completed</>
              )}
            </div>
            <div className="text-sm text-slate-400">
              {todos.length} {todos.length === 1 ? 'task' : 'tasks'} total
            </div>
          </div>
        )}

        {/* TODO List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-1">
                No tasks yet
              </h3>
              <p className="text-slate-500">
                Add a task above to get started
              </p>
            </div>
          ) : (
            /* TODO Items */
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                  todo.completed ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 hover:border-blue-500'
                    }`}
                    aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {todo.completed && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Todo Text */}
                  <span
                    className={`flex-1 text-left break-all transition-all ${
                      todo.completed
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700'
                    }`}
                  >
                    {todo.text}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete task"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        {todos.length > 0 && (
          <div className="mt-6 text-center text-xs text-slate-400">
            Press Enter to quickly add a task • Click the circle to complete • Click the trash to delete
          </div>
        )}
      </div>
    </div>
  )
}

export default App
