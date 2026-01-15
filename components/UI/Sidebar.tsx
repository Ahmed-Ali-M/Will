import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SidebarView, Task } from '../../types';
import { isSameDay, getRelativeDateLabel } from '../../utils/dateUtils';
import { Inbox, Calendar, Sun, Cloud, CheckSquare, Clock, X, ChevronRight, PieChart, Layout, Link as LinkIcon, ArrowUp, Edit2, Unlink, List, ListOrdered, ChevronDown, ChevronUp, Check, Hash, Filter, Search } from 'lucide-react';

interface SidebarTaskCardProps {
    task: Task;
    isConnected: boolean;
    parentTitle: string | null | undefined;
    onSelect: (id: string) => void;
    onEdit: (task: Task, e: React.MouseEvent) => void;
    onUpdate: (task: Partial<Task>) => void;
    onLinkClick: (e: React.MouseEvent, parentId: string) => void;
    currentView: SidebarView;
}

const SidebarTaskCard: React.FC<SidebarTaskCardProps> = ({ task, isConnected, parentTitle, onSelect, onEdit, onUpdate, onLinkClick, currentView }) => {
    const [expanded, setExpanded] = useState(false);

    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ id: task.id, isCompleted: !task.isCompleted });
    };

    const handleUnlink = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ id: task.id, parentId: undefined });
    };

    const toggleChecklistItem = (itemId: string) => {
        if (!task.checklist) return;
        const newChecklist = task.checklist.map(item => 
          item.id === itemId ? { ...item, isDone: !item.isDone } : item
        );
        onUpdate({ id: task.id, checklist: newChecklist });
    };

    const hasDetails = (task.description || (task.checklist && task.checklist.length > 0) || (task.attachments && task.attachments.length > 0));

    return (
        <div
            onClick={() => onSelect(task.id)}
            className={`flex-1 bg-white dark:bg-slate-800 border p-4 rounded-xl transition-all duration-300 cursor-pointer group hover:-translate-y-0.5
                ${task.isCompleted 
                    ? 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-70' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg'
                }
            `}
        >
            <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                        onClick={handleToggleComplete}
                        className={`mt-1 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all active:scale-90 duration-200
                            ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400 hover:scale-110'}
                        `}
                    >
                         {task.isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    
                    <h4 className={`text-base font-bold text-slate-700 dark:text-slate-200 truncate leading-snug ${task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                        {task.title}
                    </h4>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {task.dueDate && currentView !== SidebarView.TODAY && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {getRelativeDateLabel(task.dueDate)}
                        </span>
                    )}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task, e);
                        }}
                        className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                        title="Edit Task"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
            </div>

            {parentTitle && (
                <div className="flex items-center gap-2 mb-2 ml-7">
                     <div 
                        onClick={(e) => onLinkClick(e, task.parentId!)}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all"
                        role="button"
                        title={`Go to ${parentTitle}`}
                    >
                        <ArrowUp size={12} className="rotate-45" />
                        <span>Linked to: {parentTitle}</span>
                    </div>
                    <button 
                        onClick={handleUnlink}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-opacity"
                        title="Unlink Task"
                    >
                        <Unlink size={12} />
                    </button>
                </div>
            )}

            <div className="ml-7">
                {task.description && !expanded && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {task.description}
                    </p>
                )}

                {expanded && (
                    <div className="mt-2 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                         {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {task.description}
                            </p>
                        )}
                        
                        {task.checklist && task.checklist.length > 0 && (
                            <div className="space-y-1 pt-1">
                                {task.checklist.map(item => (
                                    <div 
                                        key={item.id} 
                                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 -ml-1 rounded transition-colors"
                                        onClick={(e) => { e.stopPropagation(); toggleChecklistItem(item.id); }}
                                    >
                                        <div className={`mt-0.5 w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors flex-shrink-0 ${item.isDone ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-500 group-hover/item:border-blue-400'}`}>
                                            {item.isDone && <Check size={10} className="text-white"/>}
                                        </div>
                                        <span className={`${item.isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                         {task.attachments && task.attachments.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                <span className="font-semibold">{task.attachments.length} Attachment{task.attachments.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex items-center justify-between mt-2 min-h-[20px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        {task.tags?.map(tag => (
                            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-600">
                                #{tag}
                            </span>
                        ))}
                    </div>
                    
                    {hasDetails && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                            className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 p-1 transition-colors active:scale-90"
                        >
                             {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


interface SidebarProps {
  currentView: SidebarView;
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onClose: () => void;
  onChangeView: (view: SidebarView) => void;
  onEditTask: (task: Task, e: React.MouseEvent) => void;
  onUpdateTask: (task: Partial<Task>) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, tasks, onSelectTask, onClose, onChangeView, onEditTask, onUpdateTask, selectedTag, onSelectTag }) => {
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const [localSearch, setLocalSearch] = useState('');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Extract unique tags from all tasks
  const uniqueTags = useMemo(() => {
      const allTags = new Set<string>();
      tasks.forEach(t => {
          if (t.tags) t.tags.forEach(tag => allTags.add(tag));
      });
      return Array.from(allTags).sort();
  }, [tasks]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
              setIsTagMenuOpen(false);
          }
      };
      if (isTagMenuOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTagMenuOpen]);

  const groupedTasks = useMemo(() => {
    let filtered: Task[] = [];
    // First Filter by View
    switch (currentView) {
      case SidebarView.INBOX:
        filtered = tasks.filter(t => !t.isCompleted);
        break;
      case SidebarView.TODAY:
        filtered = tasks.filter(t => !t.isCompleted && t.dueDate && isSameDay(new Date(t.dueDate), today));
        break;
      case SidebarView.TOMORROW:
        filtered = tasks.filter(t => !t.isCompleted && t.dueDate && isSameDay(new Date(t.dueDate), tomorrow));
        break;
      case SidebarView.UPCOMING:
        filtered = tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) > tomorrow);
        break;
      case SidebarView.LOG:
        filtered = tasks.filter(t => t.isCompleted);
        break;
      default:
        filtered = [];
    }

    // Then Filter by Tag if selected
    if (selectedTag) {
        filtered = filtered.filter(t => t.tags && t.tags.includes(selectedTag));
    }

    // Filter by Local Search
    if (localSearch) {
        const lower = localSearch.toLowerCase();
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            (t.description && t.description.toLowerCase().includes(lower))
        );
    }

    filtered.sort((a,b) => {
         if (!a.dueDate) return 1;
         if (!b.dueDate) return -1;
         return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const groups: { label: string; tasks: Task[] }[] = [];
    
    if (filtered.length === 0) return [];

    if (currentView === SidebarView.TODAY || currentView === SidebarView.TOMORROW) {
        groups.push({ label: 'Schedule', tasks: filtered });
    } else {
        filtered.forEach(task => {
            const dateLabel = task.dueDate ? getRelativeDateLabel(task.dueDate) : 'No Date';
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.label === dateLabel) {
                lastGroup.tasks.push(task);
            } else {
                groups.push({ label: dateLabel, tasks: [task] });
            }
        });
    }
    return groups;

  }, [currentView, tasks, today, tomorrow, selectedTag, localSearch]);


  const getTaskView = (task: Task): SidebarView => {
      if (task.isCompleted) return SidebarView.LOG;
      if (!task.dueDate) return SidebarView.INBOX;
      const d = new Date(task.dueDate);
      if (isSameDay(d, today)) return SidebarView.TODAY;
      if (isSameDay(d, tomorrow)) return SidebarView.TOMORROW;
      if (d > tomorrow) return SidebarView.UPCOMING;
      return SidebarView.INBOX; 
  };

  const handleLinkClick = (e: React.MouseEvent, parentId: string) => {
      e.stopPropagation();
      const parentTask = tasks.find(t => t.id === parentId);
      if (parentTask) {
          const view = getTaskView(parentTask);
          onChangeView(view);
          setTimeout(() => {
             onSelectTask(parentTask.id);
          }, 50);
      }
  };

  const menuItems = [
    { id: SidebarView.INBOX, icon: Inbox, label: 'Inbox', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100/50 dark:bg-blue-900/30', count: tasks.filter(t => !t.isCompleted).length },
    { id: SidebarView.TODAY, icon: Sun, label: 'Today', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100/50 dark:bg-amber-900/30', count: tasks.filter(t => !t.isCompleted && t.dueDate && isSameDay(new Date(t.dueDate), today)).length },
    { id: SidebarView.TOMORROW, icon: Calendar, label: 'Tomorrow', color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-100/50 dark:bg-indigo-900/30', count: tasks.filter(t => !t.isCompleted && t.dueDate && isSameDay(new Date(t.dueDate), tomorrow)).length },
    { id: SidebarView.UPCOMING, icon: Cloud, label: 'Upcoming', color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-100/50 dark:bg-sky-900/30', count: tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) > tomorrow).length },
    { id: SidebarView.LOG, icon: CheckSquare, label: 'Logbook', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', count: tasks.filter(t => t.isCompleted).length },
  ];

  const currentMenuLabel = menuItems.find(i => i.id === currentView)?.label;

  const getHeaderDescription = () => {
      const count = groupedTasks.reduce((acc, g) => acc + g.tasks.length, 0);
      const label = currentMenuLabel?.toLowerCase() || 'view';
      const tagSuffix = selectedTag ? ` tagged #${selectedTag}` : '';
      const searchSuffix = localSearch ? ` matching "${localSearch}"` : '';
      
      if (count === 0) {
          if (localSearch) return `No matches for "${localSearch}" in ${label}.`;
          if (currentView === SidebarView.TODAY) return "You're all caught up for today!";
          return `No tasks found in ${label}${tagSuffix}.`;
      }
      if (currentView === SidebarView.TODAY) {
          return `You have ${count} task${count === 1 ? '' : 's'} to tackle today${tagSuffix}${searchSuffix}.`;
      }
      return `You have ${count} task${count === 1 ? '' : 's'} in ${label}${tagSuffix}${searchSuffix}.`;
  };

  const formatTime = (dateStr?: string) => {
      if (!dateStr) return 'Anytime';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Anytime';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getParentTitle = (parentId?: string) => {
      if (!parentId) return null;
      return tasks.find(t => t.id === parentId)?.title;
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
    >
      <style>{`
        @keyframes waveReveal {
            0% { clip-path: circle(0% at 50% 90%); background-color: transparent; }
            100% { clip-path: circle(150% at 50% 90%); background-color: rgba(15, 23, 42, 0.2); }
        }
      `}</style>

      <div 
        className="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
        style={{
            animation: 'waveReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/40" onClick={onClose} />

        <div className="relative w-[85vw] h-[80vh] max-w-6xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] border border-white/60 dark:border-slate-700/60 overflow-hidden flex flex-col md:flex-row ring-1 ring-white/50 dark:ring-white/10 animate-[scaleIn_0.4s_ease-out_0.1s_both]">
            
            <div className="w-full md:w-72 bg-slate-50/60 dark:bg-slate-800/60 flex flex-col gap-2 border-r border-slate-100/50 dark:border-slate-700/50 relative overflow-hidden">
                <div className="p-6 pb-2">
                    <div className="mb-6 flex items-center gap-3 px-2 mt-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Layout size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white text-lg leading-none tracking-tight">Schedule</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Overview</p>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onChangeView(item.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                                    ${currentView === item.id 
                                        ? 'bg-white dark:bg-slate-700 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50 text-slate-800 dark:text-white' 
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${currentView === item.id ? item.bg : 'bg-transparent group-hover:bg-slate-100 dark:group-hover:bg-slate-700'} ${item.color} transition-colors`}>
                                        <item.icon size={16} strokeWidth={2.5} />
                                    </div>
                                    <span className="tracking-tight">{item.label}</span>
                                </div>
                                {item.count > 0 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                                        ${currentView === item.id ? 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200' : 'bg-transparent text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-600'}
                                    `}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Stats - Removed Tags Section from here */}
                <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-700/50 px-8 pb-6">
                    <div className="flex items-center gap-2 text-slate-400">
                        <PieChart size={14} />
                        <p className="text-xs font-medium">
                            {tasks.filter(t => t.isCompleted).length} tasks completed total
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white/40 dark:bg-slate-900/40 relative">
                 <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors z-10 backdrop-blur-md active:scale-90"
                >
                    <X size={20} />
                </button>

                {/* Top Right Controls Container */}
                <div className="absolute top-6 right-16 z-20 flex items-center gap-3" ref={tagMenuRef}>
                    
                    {/* Local Search Input */}
                    <div className="relative group">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                         <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder="Filter..."
                            className="w-32 focus:w-48 transition-all duration-300 pl-9 pr-3 py-2 rounded-full text-sm font-medium bg-white/80 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:text-slate-200 backdrop-blur-md"
                         />
                         {localSearch && (
                            <button 
                                onClick={() => setLocalSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={12} />
                            </button>
                         )}
                    </div>

                    {/* Tag Filter Dropdown */}
                    {uniqueTags.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all shadow-sm border backdrop-blur-md
                                    ${selectedTag 
                                        ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                                        : 'bg-white/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
                                    }
                                `}
                            >
                                {selectedTag ? <Hash size={14} strokeWidth={2.5}/> : <Filter size={14} />}
                                {selectedTag ? selectedTag : 'Filter'}
                                {selectedTag ? 
                                    <span onClick={(e) => { e.stopPropagation(); onSelectTag && onSelectTag(''); }} className="ml-1 hover:bg-white/20 rounded-full p-0.5"><X size={12}/></span>
                                    : <ChevronDown size={14} className={`transition-transform duration-200 ${isTagMenuOpen ? 'rotate-180' : ''}`} />
                                }
                            </button>

                            {isTagMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-[scaleIn_0.1s_ease-out] py-1">
                                    {uniqueTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                onSelectTag && onSelectTag(tag);
                                                setIsTagMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between
                                                ${selectedTag === tag ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-200'}
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Hash size={14} className="text-slate-400"/> {tag}
                                            </span>
                                            {selectedTag === tag && <Check size={14} />}
                                        </button>
                                    ))}
                                    {selectedTag && (
                                        <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                            <button
                                                onClick={() => {
                                                    onSelectTag && onSelectTag('');
                                                    setIsTagMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                            >
                                                Clear Filter
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 pb-4">
                    <div className="flex items-baseline gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                            {currentMenuLabel}
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                        {getHeaderDescription()}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-12 pt-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                     {groupedTasks.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 pb-20 animate-fadeIn">
                             {localSearch ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                                        <Search size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No matches found</p>
                                </div>
                             ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                                        <CheckSquare size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No tasks found</p>
                                </div>
                             )}
                         </div>
                     ) : (
                        <div className="relative pl-4 space-y-8">
                            
                            {groupedTasks.map((group, groupIdx) => (
                                <div key={group.label} className="animate-slideUp" style={{ animationDelay: `${groupIdx * 0.1}s` }}>
                                    
                                    {(currentView !== SidebarView.TODAY && currentView !== SidebarView.TOMORROW) && (
                                        <div className="flex items-center gap-3 mb-6 ml-16">
                                            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{group.label}</span>
                                            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                                        </div>
                                    )}

                                    <div className="space-y-6 relative">
                                        {group.tasks.map((task, index) => {
                                            const parentTitle = getParentTitle(task.parentId);
                                            const isConnected = !!task.parentId; 
                                            const delay = (groupIdx * 0.1) + (index * 0.05);

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="relative flex items-start gap-6 group animate-slideRight"
                                                    style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
                                                >
                                                    <div className="w-16 text-right pt-3 flex-shrink-0">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block">{formatTime(task.dueDate)}</span>
                                                    </div>

                                                    {isConnected ? (
                                                        <div className="relative pt-4 flex-shrink-0 flex flex-col items-center">
                                                            <div className={`w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-800 z-10 relative transition-colors duration-300 shadow-sm group-hover:animate-pulseSoft
                                                                ${task.isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900' : 'border-blue-500 group-hover:bg-blue-500'}
                                                            `} />
                                                            <div className="absolute top-7 bottom-[-32px] w-px bg-slate-200/60 dark:bg-slate-700/60 -z-0" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-3 flex-shrink-0 flex justify-center pt-4">
                                                             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                        </div>
                                                    )}

                                                    <SidebarTaskCard 
                                                        task={task}
                                                        isConnected={isConnected}
                                                        parentTitle={parentTitle}
                                                        onSelect={onSelectTask}
                                                        onEdit={onEditTask}
                                                        onUpdate={onUpdateTask}
                                                        onLinkClick={handleLinkClick}
                                                        currentView={currentView}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;