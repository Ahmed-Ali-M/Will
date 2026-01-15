import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../../types';
import { Search, MapPin, Clock, X } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask: (id: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ isOpen, onClose, tasks, onSelectTask }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
    } else {
        setQuery('');
        setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const lower = query.toLowerCase();
    const isTagSearch = lower.startsWith('#');
    const cleanQuery = isTagSearch ? lower.slice(1) : lower;

    const filtered = tasks.filter(t => {
        if (isTagSearch) {
            return t.tags?.some(tag => tag.toLowerCase().includes(cleanQuery));
        }
        return (
            t.title.toLowerCase().includes(lower) || 
            t.description?.toLowerCase().includes(lower) ||
            formatDate(t.dueDate).toLowerCase().includes(lower) ||
            t.tags?.some(tag => tag.toLowerCase().includes(lower))
        );
    });
    setResults(filtered);
  }, [query, tasks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Blurry Backdrop with Ripple/Fade */}
        <div 
            className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl animate-fadeIn"
            onClick={onClose}
        />

        {/* Search Container */}
        <div className="relative w-full max-w-2xl px-4 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={24} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tasks, tags, or dates..."
                    className="w-full h-20 bg-white dark:bg-slate-800 pl-16 pr-16 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 text-xl font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
                <button 
                    onClick={onClose}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="mt-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/50 overflow-hidden max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 animate-fadeIn">
                    <div className="p-2 space-y-1">
                        {results.map(task => (
                            <button
                                key={task.id}
                                onClick={() => {
                                    onSelectTask(task.id);
                                    onClose();
                                }}
                                className="w-full text-left px-5 py-4 hover:bg-white dark:hover:bg-slate-700/80 rounded-2xl flex items-center justify-between group transition-all"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{task.title}</p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                                            <Clock size={12} />
                                            {formatDate(task.dueDate) || 'No date'}
                                        </span>
                                        {task.tags && task.tags.length > 0 && (
                                            <div className="flex gap-1">
                                                {task.tags.map(tag => (
                                                    <span key={tag} className="text-xs text-blue-500 dark:text-blue-400 font-medium">#{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <MapPin size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {!query && (
                <div className="mt-8 text-center text-slate-400 dark:text-slate-500 animate-fadeIn delay-100">
                    <p className="text-sm font-medium">Type to search across all tasks</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default SearchBar;