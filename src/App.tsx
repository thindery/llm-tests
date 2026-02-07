import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Types
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

type FilterType = 'all' | 'active' | 'completed';

// Icons (SVG components for lightweight solution)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const EmptyStateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
    <path d="M9 11l3 3L22 4"></path>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

// Custom hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App() {
  // State
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  // Derived state
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  // Handlers
  const addTodo = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos(prev => [newTodo, ...prev]);
    setInputValue('');
    
    // Animate new item
    setAnimatingItems(prev => {
      const next = new Set(prev);
      next.add(newTodo.id);
      setTimeout(() => {
        setAnimatingItems(current => {
          const updated = new Set(current);
          updated.delete(newTodo.id);
          return updated;
        });
      }, 300);
      return next;
    });
  }, [inputValue, setTodos]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, [setTodos]);

  const deleteTodo = useCallback((id: string) => {
    // Animate out
    setAnimatingItems(prev => {
      const next = new Set(prev);
      next.add(`deleting-${id}`);
      return next;
    });

    // Actually remove after animation
    setTimeout(() => {
      setTodos(prev => prev.filter(t => t.id !== id));
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(`deleting-${id}`);
        return next;
      });
    }, 250);
  }, [setTodos]);

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditValue(todo.text);
  };

  const saveEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    setTodos(prev => prev.map(todo =>
      todo.id === editingId ? { ...todo, text: trimmed } : todo
    ));
    setEditingId(null);
    setEditValue('');
  }, [editValue, editingId, setTodos]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const clearCompleted = useCallback(() => {
    // Animate all completed items
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    completedIds.forEach(id => {
      setAnimatingItems(prev => new Set([...prev, `deleting-${id}`]));
    });

    setTimeout(() => {
      setTodos(prev => prev.filter(t => !t.completed));
      setAnimatingItems(new Set());
    }, 250);
  }, [todos, setTodos]);

  // Toggle dark mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-4xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Tasks
            </h1>
            <p className={`mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Stay organized and get things done
            </p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        {/* Input Section */}
        <div className={`rounded-xl shadow-lg p-2 mb-6 transition-colors ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className={`flex-1 px-4 py-3 rounded-lg outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400' 
                  : 'bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 focus:border-blue-500'
              }`}
            />
            <button
              onClick={addTodo}
              disabled={!inputValue.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                inputValue.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PlusIcon />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === f
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                filter === f
                  ? isDarkMode ? 'bg-blue-500' : 'bg-blue-200'
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                {f === 'all' ? todos.length : f === 'active' ? activeCount : completedCount}
              </span>
            </button>
          ))}
        </div>

        {/* Todo List */}
        <div className={`rounded-xl shadow-lg overflow-hidden transition-colors ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {filteredTodos.length === 0 ? (
            <div className={`py-16 text-center transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              <div className="flex justify-center mb-4">
                <EmptyStateIcon />
              </div>
              <p className="text-lg font-medium">
                {filter === 'all' 
                  ? 'No tasks yet. Add one above!' 
                  : filter === 'active' 
                    ? 'No active tasks!' 
                    : 'No completed tasks!'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTodos.map((todo) => {
                const isDeleting = animatingItems.has(`deleting-${todo.id}`);
                const isNew = animatingItems.has(todo.id);
                
                return (
                  <li
                    key={todo.id}
                    className={`group flex items-center gap-3 px-4 py-4 transition-all duration-250 ${
                      isDeleting 
                        ? 'opacity-0 transform -translate-x-full' 
                        : isNew 
                          ? 'opacity-0 transform translate-x-4 animate-slideIn'
                          : ''
                    } ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                    style={{
                      animation: isNew ? 'slideIn 0.3s ease-out forwards' : undefined,
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                        todo.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : isDarkMode
                            ? 'border-gray-500 hover:border-gray-400'
                            : 'border-gray-300 hover:border-blue-400'
                      }`}
                      aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {todo.completed && <CheckIcon />}
                    </button>

                    {/* Todo Text or Edit Input */}
                    {editingId === todo.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={saveEdit}
                          autoFocus
                          className={`flex-1 px-3 py-1 rounded outline-none ${
                            isDarkMode
                              ? 'bg-gray-700 text-white'
                              : 'bg-blue-50 text-gray-900 border border-blue-300'
                          }`}
                        />
                        <button
                          onClick={saveEdit}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                        >
                          <CheckIcon />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`flex-1 transition-all duration-200 cursor-pointer ${
                            todo.completed
                              ? 'line-through opacity-50'
                              : isDarkMode ? 'text-gray-200' : 'text-gray-800'
                          }`}
                          onDoubleClick={() => startEdit(todo)}
                        >
                          {todo.text}
                        </span>

                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(todo)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            aria-label="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            aria-label="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer Stats */}
        <div className={`mt-4 flex items-center justify-between text-sm transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span>
            {activeCount} {activeCount === 1 ? 'task' : 'tasks'} remaining
          </span>
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className={`transition-colors hover:underline ${
                isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Clear {completedCount} completed
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className={`mt-8 text-center text-xs transition-colors ${
          isDarkMode ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Tip: Double-click a task to edit it • Press Enter to save
        </p>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(1rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .dark .divide-gray-200 {
          border-color: #374151;
        }
      `}</style>
    </div>
  );
}

export default App;
