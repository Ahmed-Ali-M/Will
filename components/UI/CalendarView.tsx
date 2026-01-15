import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { isSameDay, formatDate } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface CalendarViewProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    origin?: { x: number, y: number } | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarView: React.FC<CalendarViewProps> = ({ isOpen, onClose, tasks, origin }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [direction, setDirection] = useState(0); // -1 for left, 1 for right, 0 for none

    const today = new Date();

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
            // Normalize to YYYY-MM-DD local
            const d = new Date(task.dueDate);
            if (isNaN(d.getTime())) return;
            
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        return map;
    }, [tasks]);

    const changeMonth = (delta: number) => {
        setDirection(delta);
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setDirection(0);
        setCurrentDate(new Date());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            <style>{`
                @keyframes calendarReveal {
                    0% { clip-path: circle(0% at var(--origin-x) var(--origin-y)); opacity: 0; transform: scale(0.9); }
                    100% { clip-path: circle(150% at var(--origin-x) var(--origin-y)); opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div 
                className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 w-full max-w-4xl h-[700px] flex flex-col overflow-hidden ring-1 ring-black/5"
                style={{
                    ['--origin-x' as any]: origin ? `${origin.x}px` : '50%',
                    ['--origin-y' as any]: origin ? `${origin.y}px` : '100%',
                    animation: 'calendarReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    transformOrigin: origin ? `${origin.x}px ${origin.y}px` : 'bottom center'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <CalendarIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-none">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                {tasks.length} total tasks
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mr-2">
                            Today
                        </button>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500 dark:text-slate-400">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all text-slate-500 dark:text-slate-400">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <button onClick={onClose} className="ml-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 flex flex-col p-6">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-4">
                        {WEEKDAYS.map(day => (
                            <div key={day} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2">
                        {calendarDays.map((dayObj, idx) => {
                            const isToday = isSameDay(dayObj.date, today);
                            const key = `${dayObj.date.getFullYear()}-${dayObj.date.getMonth()}-${dayObj.date.getDate()}`;
                            const dayTasks = tasksByDate[key] || [];
                            const isSelectedMonth = dayObj.isCurrentMonth;

                            return (
                                <div 
                                    key={idx}
                                    className={`
                                        relative rounded-xl border p-2 flex flex-col gap-1 group transition-all duration-200
                                        ${isSelectedMonth 
                                            ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md' 
                                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent text-slate-300 dark:text-slate-600'
                                        }
                                        ${isToday ? 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 z-10' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`
                                            text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                            ${isToday 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                                : isSelectedMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'
                                            }
                                        `}>
                                            {dayObj.date.getDate()}
                                        </span>
                                    </div>

                                    {/* Task Indicators */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden mt-1">
                                        {dayTasks.slice(0, 3).map(task => (
                                            <div 
                                                key={task.id} 
                                                className={`
                                                    h-1.5 rounded-full w-full transition-all
                                                    ${task.isCompleted 
                                                        ? 'bg-green-400/70 dark:bg-green-500/50' 
                                                        : (new Date(task.dueDate) < today && !isToday)
                                                            ? 'bg-red-400/70 dark:bg-red-500/50'
                                                            : 'bg-blue-400/70 dark:bg-blue-500/50'
                                                    }
                                                `} 
                                            />
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 self-center" />
                                        )}
                                    </div>

                                    {/* Hover Tooltip / Detail View */}
                                    {dayTasks.length > 0 && (
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 p-3 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all scale-95 group-hover:scale-100 origin-bottom">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                                                {dayObj.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' })}
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-600">
                                                {dayTasks.map(task => (
                                                    <div key={task.id} className="flex items-start gap-2">
                                                        {task.isCompleted 
                                                            ? <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                            : (new Date(task.dueDate) < today && !isToday)
                                                                ? <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                                : <Clock size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                        }
                                                        <span className={`text-xs font-medium leading-snug ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                            {task.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;