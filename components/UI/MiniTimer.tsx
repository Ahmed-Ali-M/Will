import React, { useEffect, useState } from 'react';
import { Task } from '../../types';
import { Pause, Play, RotateCcw, X, Check } from 'lucide-react';
import { audio } from '../../utils/audioUtils';

interface MiniTimerProps {
    task: Task;
    onUpdate: (task: Partial<Task>) => void;
    onStop: () => void;
}

const MiniTimer: React.FC<MiniTimerProps> = ({ task, onUpdate, onStop }) => {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        if (!task.durationMinutes) return;
        const total = task.durationMinutes * 60;

        const tick = () => {
            let elapsed = task.timerState?.accumulatedSeconds || 0;
            if (task.timerState?.isRunning && task.timerState.startTime) {
                elapsed += (Date.now() - task.timerState.startTime) / 1000;
            }
            const r = Math.max(0, total - elapsed);
            setRemaining(r);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [task]);

    const toggle = () => {
        audio.play('click');
        const currentState = task.timerState || { isRunning: false, startTime: null, accumulatedSeconds: 0 };
        let newState = { ...currentState };

        if (currentState.isRunning) {
            // Pause
            newState.isRunning = false;
            if (currentState.startTime) {
                newState.accumulatedSeconds += (Date.now() - currentState.startTime) / 1000;
            }
            newState.startTime = null;
        } else {
            // Start
            newState.isRunning = true;
            newState.startTime = Date.now();
        }
        onUpdate({ id: task.id, timerState: newState });
    };

    const reset = () => {
        audio.play('click');
        onUpdate({ 
            id: task.id, 
            timerState: { isRunning: false, startTime: null, accumulatedSeconds: 0 } 
        });
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isRunning = task.timerState?.isRunning;
    const isDone = remaining <= 0;
    
    // Calculate progress for the background fill
    // If no duration, full width
    const progress = task.durationMinutes ? ((task.durationMinutes * 60 - remaining) / (task.durationMinutes * 60)) * 100 : 0;

    return (
        <div className="relative inline-flex items-center h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 animate-slideDown overflow-hidden min-w-0 max-w-md pointer-events-auto">
            {/* Background Progress Fill */}
            <div 
                className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-linear ${isDone ? 'bg-green-500/20' : 'bg-blue-500/10 dark:bg-blue-500/20'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
            />

            {/* Content Container */}
            <div className="relative z-10 flex items-center px-5 gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate uppercase tracking-wide max-w-[150px]">
                        {task.title}
                    </span>
                    <span className={`font-mono text-sm font-bold ${isDone ? 'text-green-500' : 'text-blue-500 dark:text-blue-400'}`}>
                        {formatTime(remaining)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100 dark:border-slate-700/50">
                    <button 
                        onClick={toggle} 
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95
                            ${isDone ? 'bg-green-500 text-white shadow-sm' : (isRunning ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400')}
                        `}
                    >
                        {isDone ? <Check size={14} /> : (isRunning ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor" className="ml-0.5"/>)}
                    </button>
                    
                    <button onClick={reset} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors active:scale-95">
                        <RotateCcw size={14} />
                    </button>
                    
                    <button onClick={onStop} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors active:scale-95">
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniTimer;