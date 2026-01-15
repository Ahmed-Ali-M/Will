import React, { useState, useEffect, useRef } from 'react';
import { Task, ChecklistItem, Attachment, TaskDate, RecurrenceConfig } from '../../types';
import { generateId, getRecurrenceText } from '../../utils/dateUtils';
import { X, Plus, Trash, Calendar, Bell, Tag, Clock, Repeat, Paperclip, FileText, AlignLeft, List, ListOrdered, Hourglass, Image as ImageIcon, Download, Check, ChevronDown } from 'lucide-react';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialData?: Partial<Task>;
  parentTask?: Task;
  origin?: { x: number, y: number } | null; 
}

type BlockType = 'description' | 'date' | 'checklist' | 'ordered' | 'attachments' | 'tags' | 'recurrence' | 'duration';

interface DialogBlock {
    id: string;
    type: BlockType;
}

// Pastel Color Generator based on string hash
const getTagColor = (tag: string) => {
    const colors = [
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
        'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
        'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
        'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
        'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800',
        'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const TaskDialog: React.FC<TaskDialogProps> = ({ isOpen, onClose, onSave, initialData, parentTask, origin }) => {
  const [title, setTitle] = useState('');
  
  // Flattened State for UI Blocks
  const [blocks, setBlocks] = useState<DialogBlock[]>([]);
  
  // Data State Store
  const [description, setDescription] = useState('');
  const [dates, setDates] = useState<TaskDate[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  
  // Recurrence State
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | undefined>(undefined);
  
  // UI Helpers
  const [showFeatureMenu, setShowFeatureMenu] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Initialize
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setTags(initialData.tags || []);
        setAttachments(initialData.attachments || []);
        setChecklistItems(initialData.checklist || []);
        setDurationMinutes(initialData.durationMinutes || 0);
        setRecurrence(initialData.recurrence);

        // Handle Dates
        if (initialData.dates && initialData.dates.length > 0) {
            setDates(initialData.dates);
        } else if (initialData.dueDate) {
             setDates([{ id: generateId(), date: initialData.dueDate, reminderMinutes: initialData.reminderMinutesBefore ?? 0 }]);
        } else {
             setDates([]);
        }

        // Reconstruct Blocks logic
        const newBlocks: DialogBlock[] = [];
        if (initialData.description) newBlocks.push({ id: generateId(), type: 'description' });
        if (initialData.dates?.length || initialData.dueDate) newBlocks.push({ id: generateId(), type: 'date' }); 
        if (initialData.checklist?.length) {
             if (initialData.checklist.some(i => i.type === 'ordered')) newBlocks.push({ id: generateId(), type: 'ordered' });
             if (initialData.checklist.some(i => !i.type || i.type === 'bullet')) newBlocks.push({ id: generateId(), type: 'checklist' });
        }
        if (initialData.attachments?.length) newBlocks.push({ id: generateId(), type: 'attachments' });
        if (initialData.tags?.length) newBlocks.push({ id: generateId(), type: 'tags' });
        if (initialData.recurrence) newBlocks.push({ id: generateId(), type: 'recurrence' });
        if (initialData.durationMinutes && initialData.durationMinutes > 0) newBlocks.push({ id: generateId(), type: 'duration' });
        
        setBlocks(newBlocks);

      } else {
        // New Task Mode - Defaults
        setTitle('');
        setDescription('');
        setChecklistItems([]);
        setTags([]);
        setAttachments([]);
        setRecurrence(undefined);
        setDurationMinutes(0);
        
        // Default UX: Prepare a date for the user (next hour)
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1);
        defaultDate.setMinutes(0, 0, 0);

        if (parentTask) {
             // If linked, try to be smarter (after parent)
             if (parentTask.dueDate) {
                 const parentD = new Date(parentTask.dueDate);
                 if (!isNaN(parentD.getTime())) {
                     defaultDate.setTime(parentD.getTime());
                     defaultDate.setHours(defaultDate.getHours() + 1);
                 }
             }
        }
        
        // Initialize with helpful blocks
        setDates([{ id: generateId(), date: defaultDate.toISOString(), reminderMinutes: 0 }]);
        setBlocks([
            { id: generateId(), type: 'description' },
            { id: generateId(), type: 'date' }
        ]);
      }
      setError(null);
      setCurrentTag('');
      setShowFeatureMenu(false);
    }
  }, [isOpen, initialData, parentTask]);

  if (!isOpen) return null;

  // --- Actions ---

  const addBlock = (type: BlockType) => {
      const exists = blocks.find(b => b.type === type);
      
      if (type === 'date') {
          const now = new Date();
          now.setHours(now.getHours() + 1);
          now.setMinutes(0);
          setDates(prev => [...prev, { id: generateId(), date: now.toISOString(), reminderMinutes: 0 }]);
          if (!exists) setBlocks(prev => [...prev, { id: generateId(), type: 'date' }]);
      }
      else if (type === 'checklist') {
          setChecklistItems(prev => [...prev, { id: generateId(), text: '', isDone: false, type: 'bullet' }]);
          if (!exists) setBlocks(prev => [...prev, { id: generateId(), type: 'checklist' }]);
      }
      else if (type === 'ordered') {
          setChecklistItems(prev => [...prev, { id: generateId(), text: '', isDone: false, type: 'ordered' }]);
          if (!exists) setBlocks(prev => [...prev, { id: generateId(), type: 'ordered' }]);
      }
      else if (type === 'duration') {
          setDurationMinutes(30); // Default 30 mins
          if (!exists) setBlocks(prev => [...prev, { id: generateId(), type: 'duration' }]);
      }
      else if (type === 'recurrence') {
          if (!exists) {
              setRecurrence({ 
                  type: 'WEEKLY', 
                  interval: 1, 
                  weekDays: [new Date().getDay()],
                  endType: 'NEVER',
                  currentCount: 0
              });
              setBlocks(prev => [...prev, { id: generateId(), type: 'recurrence' }]);
          }
      }
      else if (!exists) {
          setBlocks(prev => [...prev, { id: generateId(), type }]);
      }
      setShowFeatureMenu(false);
  };

  const removeBlock = (type: BlockType) => {
     setBlocks(prev => prev.filter(b => b.type !== type));
     if (type === 'description') setDescription('');
     if (type === 'date') setDates([]);
     if (type === 'tags') setTags([]);
     if (type === 'attachments') setAttachments([]);
     if (type === 'recurrence') setRecurrence(undefined);
     if (type === 'duration') setDurationMinutes(0);
     if (type === 'checklist') setChecklistItems(prev => prev.filter(i => i.type === 'ordered'));
     if (type === 'ordered') setChecklistItems(prev => prev.filter(i => i.type !== 'ordered'));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    let finalDueDate = '';
    let finalReminder = 0;
    
    // Validate dates before saving
    const validDates = dates.filter(d => !isNaN(new Date(d.date).getTime()));
    
    if (validDates.length > 0) {
        const sortedDates = [...validDates].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const last = sortedDates[sortedDates.length - 1];
        finalDueDate = last.date;
        finalReminder = last.reminderMinutes;
    }

    if (parentTask && finalDueDate) {
        const parentDate = new Date(parentTask.dueDate);
        const thisDate = new Date(finalDueDate);
        if (!isNaN(parentDate.getTime()) && thisDate <= parentDate) {
            setError('Connected tasks must be scheduled AFTER the previous task.');
            return;
        }
    }

    onSave({
      id: initialData?.id || generateId(),
      title,
      description,
      checklist: checklistItems,
      tags,
      attachments,
      dates: validDates,
      dueDate: finalDueDate,
      reminderMinutesBefore: finalReminder,
      recurrence,
      durationMinutes,
      isCompleted: initialData?.isCompleted || false,
      parentId: parentTask?.id || initialData?.parentId,
      timerState: initialData?.timerState || (durationMinutes > 0 ? { isRunning: false, startTime: null, accumulatedSeconds: 0 } : undefined)
    });
    onClose();
  };

  // --- Data Handlers ---

  const handleDateChange = (id: string, field: 'date' | 'time' | 'reminder' | 'clear-time', value: string | number) => {
      setDates(prev => prev.map(d => {
          if (d.id !== id) return d;
          if (field === 'reminder') return { ...d, reminderMinutes: Number(value) };
          
          const current = new Date(d.date);
          if (isNaN(current.getTime())) return d;

          if (field === 'clear-time') {
              current.setHours(0, 0, 0, 0);
          } else if (field === 'date') {
             if (typeof value === 'string') {
                const parts = value.split('-');
                if (parts.length === 3) {
                    const [y, m, day] = parts.map(Number);
                    current.setFullYear(y, m-1, day);
                }
             }
          } else if (field === 'time') {
             if (typeof value === 'string') {
                const parts = value.split(':');
                if (parts.length === 2) {
                    const [h, min] = parts.map(Number);
                    current.setHours(h, min);
                }
             }
          }
          
          return { ...d, date: current.toISOString() };
      }));
  };

  const removeDate = (id: string) => {
      setDates(prev => prev.filter(d => d.id !== id));
      if (dates.length <= 1) removeBlock('date');
  };

  const updateChecklistItem = (id: string, text: string) => {
    setChecklistItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));
  };
  const removeChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.filter(i => i.id !== id));
  };
  const addChecklistItem = (type: 'bullet' | 'ordered') => {
      setChecklistItems(prev => [...prev, { id: generateId(), text: '', isDone: false, type }]);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag();
    }
  };

  const commitTag = () => {
      const val = currentTag.trim();
      if (val && !tags.includes(val)) {
        setTags(prev => [...prev, val]);
        setCurrentTag('');
      } else if (val) {
          // If already exists, just clear input
          setCurrentTag('');
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setAttachments(prev => [...prev, {
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    data: event.target.result as string,
                    showPreview: file.type.startsWith('image/')
                }]);
            }
        };
        reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Recurrence Helper ---
  const toggleWeekDay = (dayIndex: number) => {
      if (!recurrence) return;
      const currentDays = recurrence.weekDays || [];
      const newDays = currentDays.includes(dayIndex) 
          ? currentDays.filter(d => d !== dayIndex)
          : [...currentDays, dayIndex].sort();
      setRecurrence({ ...recurrence, weekDays: newDays });
  };

  const openDatePicker = (id: string) => {
      try {
          if (dateInputRefs.current[id] && 'showPicker' in HTMLInputElement.prototype) {
              dateInputRefs.current[id]?.showPicker();
          } else {
              dateInputRefs.current[id]?.focus();
          }
      } catch(e) {
          console.warn("showPicker not supported", e);
      }
  };

  // --- Renderers ---

  const renderBlock = (block: DialogBlock) => {
      switch(block.type) {
          case 'description':
              return (
                  <div key={block.id} className="group relative">
                      <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('description')}>
                          <Trash size={14} />
                      </div>
                      <div className="flex items-start gap-2 text-slate-400 mb-1">
                          <AlignLeft size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Description</span>
                      </div>
                      <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Type description here..."
                          className="w-full bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-500/50 resize-none placeholder-slate-400"
                          rows={3}
                      />
                  </div>
              );
          case 'date':
              return (
                  <div key={block.id} className="group relative space-y-2">
                       <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('date')}>
                          <Trash size={14} />
                      </div>
                      {dates.map((d, i) => {
                          let dateVal = '', timeVal = '';
                          try {
                            const dateObj = new Date(d.date);
                            if (!isNaN(dateObj.getTime())) {
                                const y = dateObj.getFullYear();
                                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const day = String(dateObj.getDate()).padStart(2, '0');
                                dateVal = `${y}-${m}-${day}`;
                                
                                const h = String(dateObj.getHours()).padStart(2, '0');
                                const min = String(dateObj.getMinutes()).padStart(2, '0');
                                timeVal = `${h}:${min}`;
                            }
                          } catch (e) { /* ignore invalid dates */ }

                          // Check if using standard reminder options
                          const standardReminders = [0, 15, 30, 60, 1440];
                          const isCustomReminder = !standardReminders.includes(d.reminderMinutes);

                          return (
                              <div key={d.id} className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                   <div 
                                        className="flex items-center gap-2 bg-white dark:bg-slate-600 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                                        onClick={() => openDatePicker(d.id)}
                                   >
                                       <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                                       <input 
                                            ref={(el) => { dateInputRefs.current[d.id] = el; }}
                                            type="date" 
                                            value={dateVal} 
                                            onChange={(e) => handleDateChange(d.id, 'date', e.target.value)} 
                                            className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer" 
                                       />
                                   </div>
                                   
                                   {/* Time Toggle/Input */}
                                   <div className="flex items-center gap-2 bg-white dark:bg-slate-600 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-500 shadow-sm">
                                       <Clock size={14} className="text-blue-500 dark:text-blue-400" />
                                       <input 
                                            type="time" 
                                            value={timeVal} 
                                            onChange={(e) => handleDateChange(d.id, 'time', e.target.value)} 
                                            className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 font-medium min-w-[90px]" 
                                       />
                                       <button 
                                            onClick={() => handleDateChange(d.id, 'clear-time', '')} 
                                            className="text-[10px] text-slate-300 hover:text-red-400 font-bold uppercase tracking-wider"
                                            title="Set to All Day"
                                       >
                                           Clear
                                       </button>
                                   </div>

                                   <div className="flex items-center gap-1.5 ml-1">
                                       <Bell size={14} className="text-orange-500" />
                                       {!isCustomReminder ? (
                                            <select 
                                                value={d.reminderMinutes} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'custom') {
                                                        handleDateChange(d.id, 'reminder', 10); // Default to 10m for custom start
                                                    } else {
                                                        handleDateChange(d.id, 'reminder', val);
                                                    }
                                                }} 
                                                className="bg-transparent text-xs outline-none text-slate-500 dark:text-slate-400 cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-200"
                                            >
                                                <option value={0} className="dark:bg-slate-800">At time</option>
                                                <option value={15} className="dark:bg-slate-800">15m before</option>
                                                <option value={30} className="dark:bg-slate-800">30m before</option>
                                                <option value={60} className="dark:bg-slate-800">1h before</option>
                                                <option value={1440} className="dark:bg-slate-800">1 day before</option>
                                                <option value="custom" className="dark:bg-slate-800 font-semibold text-blue-500">Custom...</option>
                                            </select>
                                       ) : (
                                           <div className="flex items-center gap-1">
                                               <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.reminderMinutes}
                                                    onChange={(e) => handleDateChange(d.id, 'reminder', parseInt(e.target.value) || 0)}
                                                    className="w-10 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-blue-400 dark:text-slate-200"
                                               />
                                               <span className="text-xs text-slate-500">min</span>
                                               <button onClick={() => handleDateChange(d.id, 'reminder', 15)} className="text-xs text-slate-400 hover:text-red-500 ml-1"><X size={10}/></button>
                                           </div>
                                       )}
                                   </div>

                                   {dates.length > 1 && (
                                       <button onClick={() => removeDate(d.id)} className="ml-auto p-1.5 text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 rounded-full transition-colors"><X size={14}/></button>
                                   )}
                              </div>
                          );
                      })}
                      <button onClick={() => addBlock('date')} className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 hover:underline ml-1 font-medium"><Plus size={12}/> Add another date</button>
                  </div>
              );
          case 'checklist':
              const bullets = checklistItems.filter(i => !i.type || i.type === 'bullet');
              if (bullets.length === 0) return null;
              return (
                  <div key={block.id} className="group relative">
                       <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('checklist')}>
                          <Trash size={14} />
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <List size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Checklist</span>
                      </div>
                      <div className="space-y-2">
                          {bullets.map(item => (
                              <div key={item.id} className="flex items-center gap-2">
                                  <div className="w-4 h-4 border border-slate-300 dark:border-slate-500 rounded mx-1"></div>
                                  <input 
                                    value={item.text} 
                                    onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-600 border border-transparent focus:border-slate-200 dark:focus:border-slate-500 dark:text-slate-200"
                                    placeholder="List item"
                                  />
                                  <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-400"><X size={14}/></button>
                              </div>
                          ))}
                          <button onClick={() => addChecklistItem('bullet')} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1 ml-7"><Plus size={12}/> Add item</button>
                      </div>
                  </div>
              );
          case 'ordered':
              const ordered = checklistItems.filter(i => i.type === 'ordered');
              if (ordered.length === 0) return null;
              return (
                  <div key={block.id} className="group relative">
                       <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('ordered')}>
                          <Trash size={14} />
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <ListOrdered size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Numbered List</span>
                      </div>
                      <div className="space-y-2">
                          {ordered.map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-2">
                                  <span className="w-6 text-right text-xs text-slate-400 font-mono">{idx + 1}.</span>
                                  <input 
                                    value={item.text} 
                                    onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-600 border border-transparent focus:border-slate-200 dark:focus:border-slate-500 dark:text-slate-200"
                                    placeholder="List item"
                                  />
                                  <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-400"><X size={14}/></button>
                              </div>
                          ))}
                          <button onClick={() => addChecklistItem('ordered')} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1 ml-8"><Plus size={12}/> Add item</button>
                      </div>
                  </div>
              );
           case 'tags':
               return (
                  <div key={block.id} className="group relative">
                      <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('tags')}>
                          <Trash size={14} />
                      </div>
                       <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <Tag size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <span 
                                key={tag} 
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border ${getTagColor(tag)}`}
                            >
                                {tag}
                                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="opacity-60 hover:opacity-100"><X size={10} /></button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            onKeyDown={handleAddTag}
                            onBlur={commitTag}
                            placeholder="Type tag + Enter"
                            className="text-xs bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 rounded outline-none border border-transparent focus:border-blue-300 min-w-[120px] dark:text-slate-200 dark:focus:border-blue-500 transition-colors"
                        />
                      </div>
                  </div>
               );
            case 'attachments':
                const images = attachments.filter(a => a.type.startsWith('image/'));
                const files = attachments.filter(a => !a.type.startsWith('image/'));

                return (
                    <div key={block.id} className="group relative">
                         <div className="absolute -left-6 top-0 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('attachments')}>
                              <Trash size={14} />
                          </div>
                          <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2 text-slate-400">
                                <Paperclip size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Attachments</span>
                             </div>
                             <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1"><Plus size={10}/> Upload</button>
                             <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                          </div>
                          
                          {/* Image Gallery Grid */}
                          {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {images.map((img, idx) => (
                                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 group/img">
                                        <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <a href={img.data} download={img.name} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"><Download size={14}/></a>
                                            <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== img.id))} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm"><Trash size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                          )}

                          {/* File List */}
                          {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map(att => (
                                  <div key={att.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600 overflow-hidden group/file hover:bg-slate-100 dark:hover:bg-slate-700">
                                       <div className="w-8 h-8 flex-shrink-0 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded flex items-center justify-center">
                                            <FileText size={14} className="text-slate-400 dark:text-slate-300"/>
                                       </div>
                                       <span className="text-xs truncate flex-1 font-medium text-slate-700 dark:text-slate-200">{att.name}</span>
                                       <a href={att.data} download={att.name} className="p-1 text-slate-400 hover:text-blue-500 opacity-0 group-hover/file:opacity-100 transition-opacity"><Download size={14}/></a>
                                       <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="p-1 text-slate-300 hover:text-red-400 opacity-0 group-hover/file:opacity-100 transition-opacity"><X size={14}/></button>
                                  </div>
                                ))}
                            </div>
                          )}
                    </div>
                );
             case 'recurrence':
                 if (!recurrence) return null;
                 return (
                     <div key={block.id} className="group relative animate-[fadeIn_0.2s_ease-out]">
                          <div className="absolute -left-6 top-2 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('recurrence')}>
                              <Trash size={14} />
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-400">
                                    <Repeat size={14} /> 
                                    <span className="text-xs font-semibold uppercase tracking-wider">Recurrence</span>
                            </div>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                {getRecurrenceText(recurrence)}
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                              {/* Main Frequency & Interval */}
                              <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600 dark:text-slate-300">Repeat every</span>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={recurrence.interval} 
                                    onChange={(e) => setRecurrence({...recurrence, interval: Math.max(1, parseInt(e.target.value)||1)})}
                                    className="w-12 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-1 py-1 text-center text-sm outline-none focus:border-blue-400 dark:text-slate-200"
                                  />
                                  <select 
                                    value={recurrence.type} 
                                    onChange={(e) => setRecurrence({...recurrence, type: e.target.value as any})}
                                    className="bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-2 py-1 outline-none text-sm focus:border-blue-400 dark:text-slate-200 flex-1"
                                  >
                                      <option value="DAILY">Day{recurrence.interval > 1 ? 's' : ''}</option>
                                      <option value="WEEKLY">Week{recurrence.interval > 1 ? 's' : ''}</option>
                                      <option value="MONTHLY">Month{recurrence.interval > 1 ? 's' : ''}</option>
                                      <option value="YEARLY">Year{recurrence.interval > 1 ? 's' : ''}</option>
                                  </select>
                              </div>

                              {/* Weekly: Specific Days */}
                              {recurrence.type === 'WEEKLY' && (
                                  <div className="flex items-center justify-between bg-white dark:bg-slate-600/30 p-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
                                      {['S','M','T','W','T','F','S'].map((day, idx) => {
                                          const isActive = (recurrence.weekDays || []).includes(idx);
                                          return (
                                              <button 
                                                key={idx}
                                                onClick={() => toggleWeekDay(idx)}
                                                className={`w-7 h-7 rounded text-xs font-bold transition-all flex items-center justify-center
                                                    ${isActive 
                                                        ? 'bg-blue-500 text-white shadow-sm' 
                                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-500'
                                                    }
                                                `}
                                              >
                                                  {day}
                                              </button>
                                          )
                                      })}
                                  </div>
                              )}
                              
                              {/* Monthly: Relative vs Absolute */}
                              {recurrence.type === 'MONTHLY' && (
                                  <div className="text-xs space-y-2">
                                      <div className="flex items-center gap-2">
                                          <input 
                                            type="radio" 
                                            name="monthType" 
                                            id="monthDate" 
                                            checked={recurrence.monthType !== 'RELATIVE'}
                                            onChange={() => setRecurrence({...recurrence, monthType: 'DATE', monthDay: new Date().getDate() })} 
                                          />
                                          <label htmlFor="monthDate" className="text-slate-600 dark:text-slate-300">
                                              On day <input type="number" min="1" max="31" value={recurrence.monthDay || new Date().getDate()} onChange={(e) => setRecurrence({...recurrence, monthType: 'DATE', monthDay: parseInt(e.target.value)})} className="w-10 text-center border rounded bg-white dark:bg-slate-600 mx-1 px-1" />
                                          </label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <input 
                                            type="radio" 
                                            name="monthType" 
                                            id="monthRel" 
                                            checked={recurrence.monthType === 'RELATIVE'}
                                            onChange={() => setRecurrence({...recurrence, monthType: 'RELATIVE', monthWeekNum: 1, monthWeekDay: new Date().getDay() })} 
                                          />
                                          <label htmlFor="monthRel" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                              On the 
                                              <select 
                                                value={recurrence.monthWeekNum || 1} 
                                                onChange={(e) => setRecurrence({...recurrence, monthType: 'RELATIVE', monthWeekNum: parseInt(e.target.value)})}
                                                className="bg-white dark:bg-slate-600 border rounded px-1"
                                                disabled={recurrence.monthType !== 'RELATIVE'}
                                              >
                                                  <option value={1}>1st</option>
                                                  <option value={2}>2nd</option>
                                                  <option value={3}>3rd</option>
                                                  <option value={4}>4th</option>
                                                  <option value={-1}>Last</option>
                                              </select>
                                              <select 
                                                value={recurrence.monthWeekDay ?? new Date().getDay()} 
                                                onChange={(e) => setRecurrence({...recurrence, monthType: 'RELATIVE', monthWeekDay: parseInt(e.target.value)})}
                                                className="bg-white dark:bg-slate-600 border rounded px-1"
                                                disabled={recurrence.monthType !== 'RELATIVE'}
                                              >
                                                  <option value={0}>Sunday</option>
                                                  <option value={1}>Monday</option>
                                                  <option value={2}>Tuesday</option>
                                                  <option value={3}>Wednesday</option>
                                                  <option value={4}>Thursday</option>
                                                  <option value={5}>Friday</option>
                                                  <option value={6}>Saturday</option>
                                              </select>
                                          </label>
                                      </div>
                                  </div>
                              )}

                              {/* End Conditions */}
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Ends</label>
                                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                      <div className="flex items-center gap-2">
                                          <input type="radio" name="endType" checked={!recurrence.endType || recurrence.endType === 'NEVER'} onChange={() => setRecurrence({...recurrence, endType: 'NEVER'})} />
                                          <span>Never</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <input type="radio" name="endType" checked={recurrence.endType === 'DATE'} onChange={() => setRecurrence({...recurrence, endType: 'DATE', endDate: new Date().toISOString()})} />
                                          <span>On</span>
                                          <input type="date" disabled={recurrence.endType !== 'DATE'} value={recurrence.endDate ? new Date(recurrence.endDate).toISOString().split('T')[0] : ''} onChange={(e) => setRecurrence({...recurrence, endDate: e.target.value})} className="border rounded bg-white dark:bg-slate-600 px-1 disabled:opacity-50" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <input type="radio" name="endType" checked={recurrence.endType === 'COUNT'} onChange={() => setRecurrence({...recurrence, endType: 'COUNT', endCount: 5})} />
                                          <span>After</span>
                                          <input type="number" min="1" disabled={recurrence.endType !== 'COUNT'} value={recurrence.endCount || 1} onChange={(e) => setRecurrence({...recurrence, endCount: parseInt(e.target.value)})} className="w-12 border rounded bg-white dark:bg-slate-600 px-1 text-center disabled:opacity-50" />
                                          <span>occurrences</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                     </div>
                 );
             case 'duration':
                 return (
                    <div key={block.id} className="group relative">
                        <div className="absolute -left-6 top-2 p-1 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeBlock('duration')}>
                           <Trash size={14} />
                       </div>
                       <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Hourglass size={14} /> <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
                      </div>
                       <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                           <div className="flex flex-col">
                               <label className="text-[10px] text-slate-400 font-semibold mb-0.5">MINUTES</label>
                               <input 
                                    type="number" 
                                    min="0"
                                    value={durationMinutes} 
                                    onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))} 
                                    className="bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-2 py-1 w-24 text-sm font-mono text-center outline-none focus:border-blue-400 dark:text-slate-200"
                               />
                           </div>
                           <div className="text-xs text-slate-400 mt-3 flex-1">
                               Total estimated time for this task.
                           </div>
                       </div>
                    </div>
                 );
          default: return null;
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes waveRevealDialog {
            0% { clip-path: circle(0% at var(--origin-x) var(--origin-y)); }
            100% { clip-path: circle(150% at var(--origin-x) var(--origin-y)); }
        }
      `}</style>
      
      {/* Backdrop with Wave Animation */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        style={{
            ['--origin-x' as any]: origin ? `${origin.x}px` : '50%',
            ['--origin-y' as any]: origin ? `${origin.y}px` : '50%',
            animation: 'waveRevealDialog 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={onClose}
      />

      {/* Dialog Content - Scales in slightly delayed */}
      <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-visible flex flex-col max-h-[90vh] ring-1 ring-slate-900/5 animate-[scaleIn_0.3s_ease-out_0.1s_both]">
        
        {/* Header (Always Visible) */}
        <div className="px-6 py-5 flex justify-between items-start">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={parentTask ? `Link to "${parentTask.title}"` : "Untitled Task"}
              className="w-full text-2xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none bg-transparent"
              autoFocus
            />
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Blocks Area (Scrollable) */}
        <div className="px-6 pb-2 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex-1">
           {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-xs border border-red-200 dark:border-red-800 font-medium">
              {error}
            </div>
           )}

           {blocks.map(block => renderBlock(block))}
        </div>
           
       {/* Add Feature Button - Outside Scroll Area to prevent clipping */}
       <div className="px-6 pt-2 relative z-20">
           <button 
              onClick={() => setShowFeatureMenu(!showFeatureMenu)}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-2 py-1.5 rounded-lg transition-colors text-sm font-medium w-full text-left"
           >
               <Plus size={16} /> Add property...
           </button>

           {showFeatureMenu && (
               <div className="absolute bottom-full mb-1 left-6 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-1 animate-[fadeIn_0.1s_ease-out] max-h-60 overflow-y-auto">
                   <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/50">Basic</div>
                   <button onClick={() => addBlock('description')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><AlignLeft size={14}/> Description</button>
                   <button onClick={() => addBlock('date')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Calendar size={14}/> Date & Time</button>
                   <button onClick={() => addBlock('checklist')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><List size={14}/> Checklist</button>
                   <button onClick={() => addBlock('ordered')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><ListOrdered size={14}/> Numbered List</button>
                   <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/50 mt-1">Advanced</div>
                   <button onClick={() => addBlock('duration')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Hourglass size={14}/> Duration</button>
                   <button onClick={() => addBlock('tags')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Tag size={14}/> Tags</button>
                   <button onClick={() => addBlock('attachments')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Paperclip size={14}/> Attachments</button>
                   <button onClick={() => addBlock('recurrence')} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2"><Repeat size={14}/> Recurrence</button>
               </div>
           )}
       </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex justify-end gap-3 border-t border-slate-50 dark:border-slate-700/50 mt-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-slate-900 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-blue-50 shadow-lg shadow-slate-300/50 dark:shadow-blue-500/20 transition-all text-sm">
            {initialData?.id ? 'Done' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDialog;