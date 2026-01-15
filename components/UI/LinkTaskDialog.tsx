import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { X, Search, Link as LinkIcon, Clock } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface LinkTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
  tasks: Task[];
  sourceTaskId: string | null;
}

const LinkTaskDialog: React.FC<LinkTaskDialogProps> = ({ isOpen, onClose, onSelect, tasks, sourceTaskId }) => {
  const [search, setSearch] = useState('');

  const filteredTasks = useMemo(() => {
    if (!sourceTaskId) return [];
    const lower = search.toLowerCase();
    return tasks.filter(t => 
      t.id !== sourceTaskId && // Cannot link to self
      t.parentId !== sourceTaskId && // Already linked as direct child (optional check, but good for UX)
      (t.title.toLowerCase().includes(lower) || t.description?.toLowerCase().includes(lower))
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, sourceTaskId, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-slate-900/5 animate-[scaleIn_0.2s_ease-out]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <LinkIcon size={18} className="text-blue-500" />
                Link to Existing Task
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20}/></button>
        </div>
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search tasks to connect..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-200 transition-all shadow-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                />
            </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white dark:bg-slate-800">
            {filteredTasks.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <Search size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No matching tasks found</p>
                </div>
            ) : (
                filteredTasks.map(task => (
                    <button
                        key={task.id}
                        onClick={() => onSelect(task.id)}
                        className="w-full text-left p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 border border-transparent hover:border-blue-100 dark:hover:border-slate-600 group transition-all flex items-start gap-3"
                    >
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 border border-slate-100 dark:border-slate-600 shadow-sm ${task.isCompleted ? 'bg-green-400' : 'bg-blue-400'}`} />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Clock size={10} /> {formatDate(task.dueDate)}
                                </span>
                            </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-blue-500">
                            <LinkIcon size={16} />
                        </div>
                    </button>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default LinkTaskDialog;