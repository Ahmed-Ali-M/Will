import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, Attachment } from '../../types';
import { formatDate, generateId } from '../../utils/dateUtils';
import { Check, Clock, Trash2, Edit2, ListTodo, Repeat, Link as LinkIcon, Timer, Paperclip, FileText, ChevronDown, ChevronUp, Image as ImageIcon, Plus, ListOrdered, Play, Pause, RotateCcw, Hourglass, Eye, Download, X, AlertTriangle, Unlink, GripHorizontal } from 'lucide-react';
import { audio } from '../../utils/audioUtils';

interface TaskNodeProps {
  task: Task;
  sequenceIndex?: number;
  hasChildren: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (task: Task, skipHistory?: boolean) => void;
  onDelete: (id: string) => void;
  onConnectStart: (task: Task, e: React.MouseEvent) => void;
  onLinkStart: (task: Task) => void;
  onEdit: (task: Task, e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, task: Task) => void;
  onConnectionDragStart: (e: React.MouseEvent, taskId: string) => void;
  onConnectionDrop: (e: React.MouseEvent, taskId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (task: Task) => void;
  style?: React.CSSProperties;
}

// Simple Markdown Parser
const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split by newlines to preserve paragraphs
    return text.split('\n').map((line, idx) => {
        // Simple regex for bold, italic, strikethrough
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g);
        
        return (
            <div key={idx} className="min-h-[1.2em]">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-slate-700 dark:text-slate-200">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
                    }
                    if (part.startsWith('~~') && part.endsWith('~~')) {
                        return <s key={i} className="opacity-70">{part.slice(2, -2)}</s>;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    });
};

const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  sequenceIndex,
  hasChildren,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onConnectStart,
  onLinkStart,
  onEdit,
  onContextMenu,
  onConnectionDragStart,
  onConnectionDrop,
  onMouseDown,
  onDoubleClick,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const startResizeY = useRef(0);
  const startResizeHeight = useRef(0);
  
  const prevCompletedRef = useRef(task.isCompleted);

  // Timer Local State for smooth ticks
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const hasPlayedDoneSound = useRef(false);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  // Check if there is content to expand
  const hasContent = useMemo(() => {
    return (
        (!!task.checklist && task.checklist.length > 0) || 
        (!!task.attachments && task.attachments.length > 0) ||
        ((task.durationMinutes || 0) > 0)
    );
  }, [task]);

  // Auto-expand if timer is running or task is "active" via date time
  useEffect(() => {
      if (task.timerState?.isRunning) {
          setExpanded(true);
      } else if (task.dueDate && !task.isCompleted) {
          const due = new Date(task.dueDate).getTime();
          if (!isNaN(due)) {
            const now = Date.now();
            if ((task.durationMinutes || 0) > 0 && Math.abs(due - now) < 3600000) {
                setExpanded(true);
            }
          }
      }
  }, [task.timerState?.isRunning, task.dueDate, task.durationMinutes, task.isCompleted]);

  useEffect(() => {
    if (task.isCompleted && !prevCompletedRef.current) {
        audio.play('success');
        setShowCompletionEffect(true);
        const timer = setTimeout(() => setShowCompletionEffect(false), 800);
        return () => clearTimeout(timer);
    }
    prevCompletedRef.current = task.isCompleted;
  }, [task.isCompleted]);

  // Timer Tick Logic
  useEffect(() => {
    if (!task.durationMinutes) return;

    const calculateRemaining = () => {
        if (!task.timerState || !task.durationMinutes) return 0;
        const totalSeconds = task.durationMinutes * 60;
        let elapsed = task.timerState.accumulatedSeconds;
        if (task.timerState.isRunning && task.timerState.startTime) {
             elapsed += (Date.now() - task.timerState.startTime) / 1000;
        }
        return Math.max(0, totalSeconds - Math.floor(elapsed));
    };

    const val = calculateRemaining();
    setRemainingTime(val);
    
    if (val === 0 && task.timerState?.accumulatedSeconds > 0 && !hasPlayedDoneSound.current) {
         if (task.timerState?.isRunning) {
             audio.play('timer-done');
             hasPlayedDoneSound.current = true;
         }
    } else if (val > 0) {
        hasPlayedDoneSound.current = false;
    }

    let interval: number | undefined;
    if (task.timerState?.isRunning) {
        interval = window.setInterval(() => {
            const nextVal = calculateRemaining();
            setRemainingTime(nextVal);
        }, 1000);
    }

    return () => clearInterval(interval);
  }, [task.timerState, task.durationMinutes]);

  // --- Resize Handlers ---
  useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          const deltaY = (e.clientY - startResizeY.current);
          const newHeight = Math.max(100, startResizeHeight.current + deltaY);
          // CRITICAL: Skip history during drag to avoid memory crash
          onUpdate({ ...task, height: newHeight }, true);
      };

      const handleGlobalMouseUp = () => {
          if (isResizing) {
              setIsResizing(false);
              document.body.style.cursor = 'default';
          }
      };

      if (isResizing) {
          window.addEventListener('mousemove', handleGlobalMouseMove);
          window.addEventListener('mouseup', handleGlobalMouseUp);
          document.body.style.cursor = 'ns-resize';
      }

      return () => {
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
          document.body.style.cursor = 'default';
      };
  }, [isResizing, task, onUpdate]);

  const handleResizeStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Push history state ONCE before resizing begins
      onUpdate(task, false);

      setIsResizing(true);
      startResizeY.current = e.clientY;
      const element = e.currentTarget.parentElement?.parentElement;
      startResizeHeight.current = task.height || element?.clientHeight || 100;
  };

  // --- Drag and Drop Handlers (Upload) ---

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
        setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver && e.dataTransfer.types.includes('Files')) {
        setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    audio.play('pop');

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const newAttachments = await Promise.all(files.map((file: File) => {
        return new Promise<Attachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    resolve({
                        id: generateId(),
                        name: file.name,
                        type: file.type,
                        data: event.target.result as string,
                        showPreview: file.type.startsWith('image/')
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }));

    onUpdate({ ...task, attachments: [...(task.attachments || []), ...newAttachments] });
    setExpanded(true);
  };

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ ...task, isCompleted: !task.isCompleted });
  };

  const toggleExpanded = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded(!expanded);
  };

  const handleTimerAction = (e: React.MouseEvent, action: 'start' | 'pause' | 'reset') => {
      e.stopPropagation();
      audio.play('click');
      if (!task.durationMinutes) return;

      const currentState = task.timerState || { isRunning: false, startTime: null, accumulatedSeconds: 0 };
      let newState = { ...currentState };

      if (action === 'start') {
          newState.isRunning = true;
          newState.startTime = Date.now();
      } else if (action === 'pause') {
          newState.isRunning = false;
          if (currentState.startTime) {
             newState.accumulatedSeconds += (Date.now() - currentState.startTime) / 1000;
          }
          newState.startTime = null;
      } else if (action === 'reset') {
          newState.isRunning = false;
          newState.startTime = null;
          newState.accumulatedSeconds = 0;
      }

      onUpdate({ ...task, timerState: newState });
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderTimer = () => {
      if (!task.durationMinutes) return null;
      const isRunning = task.timerState?.isRunning;
      const isDone = remainingTime === 0;
      
      return (
          <div className={`mt-2 mb-3 p-3 rounded-lg border flex items-center justify-between group/timer transition-colors duration-500
              ${isDone ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600'}
          `}>
               <div className="flex items-center gap-3">
                    <span className={`text-base font-mono font-bold leading-none ${isDone ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {formatTime(remainingTime)}
                    </span>
               </div>
               <div className="flex items-center gap-1.5">
                   {!isDone && !isRunning && (
                       <button onMouseDown={stopPropagation} onClick={(e) => handleTimerAction(e, 'start')} className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded-full"><Play size={10} fill="currentColor" className="ml-0.5" /></button>
                   )}
                   {isRunning && (
                       <button onMouseDown={stopPropagation} onClick={(e) => handleTimerAction(e, 'pause')} className="w-6 h-6 flex items-center justify-center bg-amber-500 text-white rounded-full"><Pause size={10} fill="currentColor" /></button>
                   )}
                   <button onMouseDown={stopPropagation} onClick={(e) => handleTimerAction(e, 'reset')} className="w-6 h-6 flex items-center justify-center text-slate-400 bg-slate-200 dark:bg-slate-600 rounded-full"><RotateCcw size={10} /></button>
               </div>
          </div>
      );
  };

  const showSequence = sequenceIndex !== undefined && sequenceIndex > 0 && !task.isCompleted && (sequenceIndex > 1 || hasChildren);

  return (
    <>
        <div
            className={`absolute w-[300px] transition-all duration-300 ease-out group outline-none
                ${isSelected ? 'z-[100]' : 'z-10'}
            `}
            style={{
                transform: `translate(${task.x}px, ${task.y}px)`,
                minHeight: task.height ? `${task.height}px` : 'auto', 
                ...style,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={onMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(task.id);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick(task);
            }}
            onContextMenu={(e) => onContextMenu(e, task)}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseUp={(e) => onConnectionDrop(e, task.id)}
        >
            {/* ... Hourglass Icon ... */}
            {!!task.durationMinutes && task.durationMinutes > 0 && (
                <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-lg flex items-center justify-center shadow-md z-30 transition-all duration-300
                    ${task.isCompleted ? 'bg-slate-400 dark:bg-slate-600' : 'bg-slate-900 dark:bg-blue-600'}
                `}>
                    <Hourglass size={14} className="text-white" />
                </div>
            )}
            
            {/* Sequence Badge */}
            {showSequence && (
                <div className="absolute -top-4 left-6 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md z-30 border-2 border-white dark:border-slate-800 animate-scaleIn">
                    {sequenceIndex}
                </div>
            )}

            <div className={`
                relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden flex flex-col h-full
                ${task.isCompleted 
                    ? 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-80' 
                    : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1'
                }
                ${isSelected ? 'ring-2 ring-blue-500 shadow-xl' : ''}
                ${isDragOver ? 'ring-2 ring-blue-400 ring-dashed scale-105' : ''}
            `}>
                
                {/* Drag Handle for Connections */}
                <div 
                    className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 cursor-crosshair flex items-center justify-center z-50 transition-opacity duration-200
                        ${isHovered ? 'opacity-100' : 'opacity-0'}
                    `}
                    onMouseDown={(e) => onConnectionDragStart(e, task.id)}
                >
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800 hover:scale-125 transition-transform" />
                </div>

                {/* Completion Effect */}
                {showCompletionEffect && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden rounded-2xl">
                        <div className="w-[400px] h-[400px] bg-green-500 rounded-full animate-[ping_0.8s_cubic-bezier(0,0,0.2,1)_1] opacity-20" />
                        <div className="absolute inset-0 bg-green-100 dark:bg-green-900 opacity-0 animate-[pulse_0.5s_ease-out_1]" />
                    </div>
                )}
                
                {/* ... Main Content ... */}
                <div className={`p-4 flex flex-col flex-1 ${(task.durationMinutes || 0) > 0 ? 'pl-7' : 'pl-4'}`}> 
                    <div className="flex items-start gap-3.5 flex-shrink-0">
                        <button
                            onClick={toggleComplete}
                            onMouseDown={stopPropagation}
                            className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 active:scale-90
                                ${task.isCompleted 
                                    ? 'bg-slate-300 border-slate-300 dark:bg-slate-600 dark:border-slate-600' 
                                    : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400 hover:scale-110'
                                }
                            `}
                        >
                            {task.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-snug mb-1 ${task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                                {task.title}
                            </h3>
                            
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 dark:text-slate-500">
                                {task.dueDate && (
                                    <span className={`flex items-center gap-1 ${task.isCompleted ? '' : (new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                        <Clock size={10} />
                                        {formatDate(task.dueDate)}
                                    </span>
                                )}
                                {task.recurrence && (
                                     <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                        <Repeat size={10} /> 
                                        {task.recurrence.type === 'DAILY' ? 'Daily' : task.recurrence.type === 'WEEKLY' ? 'Weekly' : 'Recurring'}
                                        {task.recurrence.endType === 'COUNT' && task.recurrence.endCount && (
                                            <span className="ml-1 opacity-75 font-mono">({task.recurrence.currentCount || 0}/{task.recurrence.endCount})</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>

                         <div className={`flex flex-col gap-1 transition-opacity duration-200 ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
                            <button 
                                onClick={(e) => onEdit(task, e)}
                                onMouseDown={stopPropagation}
                                className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button 
                                onClick={() => onLinkStart(task)}
                                onMouseDown={stopPropagation}
                                className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                            >
                                <LinkIcon size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Timer UI (Inline) */}
                    {renderTimer()}

                    {/* Expandable Details */}
                    {expanded && (
                         <div className="mt-3 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                            {task.description && (
                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-slate-100 dark:border-slate-700">
                                    {renderMarkdown(task.description)}
                                </div>
                            )}

                            {/* Checklist */}
                            {task.checklist && task.checklist.length > 0 && (
                                <div className="space-y-1">
                                    {task.checklist.map(item => (
                                        <div key={item.id} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 group/item">
                                            {item.type === 'ordered' ? (
                                                <span className="text-xs text-slate-400 font-mono mt-0.5 w-4 text-right select-none">
                                                    {(task.checklist.filter(i => i.type === 'ordered').findIndex(x => x.id === item.id) + 1)}.
                                                </span>
                                            ) : (
                                                 <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newChecklist = task.checklist.map(i => i.id === item.id ? { ...i, isDone: !i.isDone } : i);
                                                        onUpdate({ ...task, checklist: newChecklist });
                                                    }}
                                                    onMouseDown={stopPropagation}
                                                    className={`mt-0.5 w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors flex-shrink-0
                                                        ${item.isDone ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-500 hover:border-blue-400'}
                                                    `}
                                                >
                                                    {item.isDone && <Check size={10} className="text-white"/>}
                                                </button>
                                            )}
                                           
                                            <span className={`${item.isDone ? 'line-through text-slate-400' : ''} break-words w-full`}>{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Attachments */}
                             {task.attachments && task.attachments.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 pt-1">
                                    {task.attachments.map(att => (
                                        <div 
                                            key={att.id} 
                                            className="group/att relative aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 cursor-pointer hover:ring-2 ring-blue-400 transition-all"
                                            onClick={(e) => { e.stopPropagation(); /* Preview logic */ }}
                                        >
                                            {att.type.startsWith('image/') ? (
                                                <img src={att.data} className="w-full h-full object-cover" alt={att.name} />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-slate-400">
                                                    <FileText size={20} />
                                                    <span className="text-[8px] truncate w-full text-center mt-1 px-1">{att.name}</span>
                                                </div>
                                            )}
                                            
                                            {/* Hover Actions */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <a href={att.data} download={att.name} onClick={stopPropagation} onMouseDown={stopPropagation} className="p-1 text-white hover:text-blue-300"><Download size={12}/></a>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onUpdate({ ...task, attachments: task.attachments.filter(a => a.id !== att.id) }); }}
                                                    onMouseDown={stopPropagation}
                                                    className="p-1 text-white hover:text-red-400"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Tags */}
                {(hasContent || (task.tags && task.tags.length > 0)) && (
                    <div className={`px-4 pb-3 flex items-center justify-between ${expanded ? 'pt-0' : 'pt-2'}`}>
                         <div className="flex items-center gap-1.5 flex-wrap">
                            {task.tags?.map(tag => (
                                <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-600">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        {hasContent && (
                             <button 
                                onClick={toggleExpanded}
                                onMouseDown={stopPropagation}
                                className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 transition-colors p-0.5"
                            >
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        )}
                    </div>
                )}
                
                {/* Resizer Handle */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-8 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mb-0.5" />
                </div>
            </div>
        </div>
    </>
  );
};

export default React.memo(TaskNode);