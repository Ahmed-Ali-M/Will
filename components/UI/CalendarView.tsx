import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { isSameDay } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Plus, Filter, ChevronDown, AlignLeft } from 'lucide-react';

interface CalendarViewProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    origin?: { x: number, y: number } | null;
    onAddTask: (date: Date) => void;
    onEditTask: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarView: React.FC<CalendarViewProps> = ({ isOpen, onClose, tasks, origin, onAddTask, onEditTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'day'>('month');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const today = new Date();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Helper to get days for the grid
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const startingDayIndex = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        
        const days = [];
        
        // Previous month filler
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startingDayIndex - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }
        
        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }
        
        // Next month filler
        const remainingCells = 42 - days.length; // 6 rows * 7 cols
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }
        
        return days;
    }, [currentDate]);

    // Map tasks to dates string keys
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        tasks.forEach(task => {
            if (!task.dueDate) return;
            
            // Filter Logic
            if (filter === 'pending' && task.isCompleted) return;
            if (filter === 'completed' && !task.isCompleted) return;

            // Normalize to YYYY-MM-DD local
            const d = new Date(task.dueDate);
            if (isNaN(d.getTime())) return;
            
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        
        // Sort by time/completed status
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });
        });
        
        return map;
    }, [tasks, filter]);

    const changePeriod = (delta: number) => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + delta);
        } else {
            newDate.setDate(newDate.getDate() + delta);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setView('month');
        setIsPickerOpen(false);
    };

    const handleDayClick = (date: Date) => {
        setCurrentDate(date);
        setView('day');
    };

    const getTaskTime = (t: Task) => {
        const d = new Date(t.dueDate);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    // Day View Helpers
    const dayTasks = tasksByDate[`${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`] || [];
    const allDayTasks = dayTasks.filter(t => !t.dueDate.includes('T') || (new Date(t.dueDate).getHours() === 0 && new Date(t.dueDate).getMinutes() === 0 && (!t.durationMinutes || t.durationMinutes >= 1440)));
    const timedTasks = dayTasks.filter(t => !allDayTasks.includes(t));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto overflow-hidden">
            <style>{`
                @keyframes calendarReveal {
                    0% { clip-path: circle(0% at var(--origin-x) var(--origin-y)); opacity: 0; transform: scale(0.95); }
                    100% { clip-path: circle(150% at var(--origin-x) var(--origin-y)); opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div 
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-[4px]"
                onClick={onClose}
            />

            <div 
                className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-slate-700/50 w-[95vw] h-[90vh] max-w-[1400px] flex flex-col overflow-hidden ring-1 ring-black/5"
                style={{
                    ['--origin-x' as any]: origin ? `${origin.x}px` : '50%',
                    ['--origin-y' as any]: origin ? `${origin.y}px` : '100%',
                    animation: 'calendarReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    transformOrigin: origin ? `${origin.x}px ${origin.y}px` : 'bottom center'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsPickerOpen(!isPickerOpen)}
                                className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all"
                            >
                                {view === 'month' 
                                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                    : currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                }
                                <ChevronDown size={20} className={`text-slate-400 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button 
                                onClick={() => setView('month')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${view === 'month' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            >
                                Month
                            </button>
                            <button 
                                onClick={() => { setView('day'); if(scrollContainerRef.current) setTimeout(() => scrollContainerRef.current?.scrollTo({ top: 480, behavior: 'smooth' }), 50); }}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${view === 'day' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                            >
                                Day
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"><ChevronLeft size={20} /></button>
                            <button onClick={goToToday} className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Today</button>
                            <button onClick={() => changePeriod(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"><ChevronRight size={20} /></button>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 relative overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
                    
                    {/* Date Picker Overlay */}
                    {isPickerOpen && (
                        <div className="absolute top-0 left-0 w-full h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-30 animate-[fadeIn_0.2s_ease-out] flex flex-col p-8">
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <button onClick={() => { const d = new Date(currentDate); d.setFullYear(d.getFullYear() - 1); setCurrentDate(d); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronLeft /></button>
                                <span className="text-4xl font-bold text-slate-800 dark:text-white">{currentDate.getFullYear()}</span>
                                <button onClick={() => { const d = new Date(currentDate); d.setFullYear(d.getFullYear() + 1); setCurrentDate(d); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronRight /></button>
                            </div>
                            <div className="grid grid-cols-4 gap-4 max-w-3xl mx-auto w-full">
                                {MONTHS.map((m, i) => (
                                    <button 
                                        key={m}
                                        onClick={() => {
                                            const d = new Date(currentDate);
                                            d.setMonth(i);
                                            setCurrentDate(d);
                                            setIsPickerOpen(false);
                                        }}
                                        className={`p-6 rounded-2xl text-lg font-semibold transition-all
                                            ${currentDate.getMonth() === i 
                                                ? 'bg-blue-500 text-white shadow-lg scale-105' 
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                            }
                                        `}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'month' ? (
                        <div className="h-full flex flex-col">
                            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                                {WEEKDAYS.map(day => (
                                    <div key={day} className="py-2 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{day}</div>
                                ))}
                            </div>
                            <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-0">
                                {calendarDays.map((dayObj, idx) => {
                                    const isToday = isSameDay(dayObj.date, today);
                                    const key = `${dayObj.date.getFullYear()}-${dayObj.date.getMonth()}-${dayObj.date.getDate()}`;
                                    const tasksForDay = tasksByDate[key] || [];
                                    const isBottomRow = Math.floor(idx / 7) === 5;
                                    const isRightCol = (idx + 1) % 7 === 0;

                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => {
                                                handleDayClick(dayObj.date);
                                            }}
                                            className={`
                                                relative p-2 flex flex-col gap-1 group/cell transition-colors cursor-pointer
                                                ${!isRightCol ? 'border-r' : ''} ${!isBottomRow ? 'border-b' : ''}
                                                border-slate-200/60 dark:border-slate-800/60
                                                ${dayObj.isCurrentMonth ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50' : 'bg-slate-50/80 dark:bg-slate-900/30 text-slate-300 dark:text-slate-700'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1 pointer-events-none">
                                                <span className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : ''}`}>
                                                    {dayObj.date.getDate()}
                                                </span>
                                            </div>
                                            
                                            {/* Scrollable Tasks Container */}
                                            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none hover:scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 space-y-1 pb-6">
                                                {tasksForDay.map(task => {
                                                    const isDone = task.isCompleted;
                                                    return (
                                                        <div 
                                                            key={task.id}
                                                            onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                                            className={`
                                                                w-full text-left px-1.5 py-1 rounded-[6px] text-[10px] font-medium flex items-center gap-1.5 transition-all mb-0.5
                                                                ${isDone ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 line-through opacity-60' : 'bg-blue-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-blue-100/50 dark:border-slate-700'}
                                                            `}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDone ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                                                            <span className="truncate">{task.title}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    const d = new Date(dayObj.date);
                                                    d.setHours(9, 0, 0, 0); // Default to 9am for Month View adds
                                                    onAddTask(d); 
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:scale-110 shadow-sm opacity-0 group-hover/cell:opacity-100 transition-all z-10"
                                            >
                                                <Plus size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // DAY VIEW
                        <div className="h-full flex flex-col">
                            {/* All Day Section */}
                            <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex">
                                <div className="w-16 p-4 text-xs font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700">All Day</div>
                                <div className="flex-1 p-2 flex flex-wrap gap-2">
                                    {allDayTasks.map(task => (
                                        <button
                                            key={task.id}
                                            onClick={() => onEditTask(task)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2 transition-all hover:shadow-md
                                                ${task.isCompleted 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                                                    : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600'
                                                }
                                            `}
                                        >
                                            <span className="truncate max-w-[200px]">{task.title}</span>
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => {
                                            const d = new Date(currentDate);
                                            d.setHours(0, 0, 0, 0);
                                            onAddTask(d);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Timeline */}
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 relative" ref={scrollContainerRef}>
                                <div className="relative min-h-[1440px]"> {/* 60px per hour */}
                                    {/* Grid Lines */}
                                    {Array.from({ length: 24 }).map((_, hour) => (
                                        <div key={hour} className="absolute w-full flex h-[60px]" style={{ top: hour * 60 }}>
                                            <div className="w-16 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-3 text-right">
                                                <span className="text-xs text-slate-400 -mt-2.5 block">
                                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                                </span>
                                            </div>
                                            <div className="flex-1 border-b border-slate-100 dark:border-slate-800/50 relative">
                                                {/* Click area to add task at this time */}
                                                <div 
                                                    className="absolute inset-0 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                                                    onClick={() => {
                                                        const d = new Date(currentDate);
                                                        d.setHours(hour, 0, 0, 0);
                                                        onAddTask(d);
                                                    }}
                                                >
                                                    <span className="hidden group-hover:block ml-2 mt-1 text-[10px] text-blue-400">+ New Task</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Current Time Line */}
                                    {isSameDay(currentDate, today) && (
                                        <div 
                                            className="absolute left-16 right-0 border-t-2 border-red-400 z-10 pointer-events-none flex items-center"
                                            style={{ top: (today.getHours() * 60) + today.getMinutes() }}
                                        >
                                            <div className="w-2 h-2 bg-red-400 rounded-full -ml-1" />
                                        </div>
                                    )}

                                    {/* Task Blocks */}
                                    {timedTasks.map(task => {
                                        const d = new Date(task.dueDate);
                                        const startMin = d.getHours() * 60 + d.getMinutes();
                                        const duration = task.durationMinutes || 60; // Default 1h for visual
                                        
                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => onEditTask(task)}
                                                className={`absolute left-16 right-4 rounded-lg p-2 border text-xs cursor-pointer hover:shadow-lg transition-all z-20 flex flex-col justify-start
                                                    ${task.isCompleted 
                                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:border-emerald-700 dark:text-emerald-100 opacity-80' 
                                                        : 'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-900/80 dark:border-blue-700 dark:text-blue-100 shadow-sm'
                                                    }
                                                `}
                                                style={{
                                                    top: startMin,
                                                    height: Math.max(30, duration), // Min height 30px
                                                    left: '4.5rem', // Offset for sidebar
                                                    right: '1rem',
                                                    // Simple conflict handling: if overlaps, we might need offset. 
                                                    // For now, full width.
                                                }}
                                            >
                                                <div className="flex items-center gap-1 font-bold">
                                                    {task.isCompleted && <CheckCircle2 size={12} />}
                                                    {task.title}
                                                </div>
                                                <div className="opacity-80 mt-0.5 text-[10px]">
                                                    {getTaskTime(task)} {task.durationMinutes ? `- ${task.durationMinutes}m` : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;