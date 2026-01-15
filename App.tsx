import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Task, Viewport, SidebarView, AppNotification, NotificationAction, AppSettings, Group } from './types';
import TaskNode from './components/Canvas/TaskNode';
import GroupNode from './components/Canvas/GroupNode';
import ConnectionLayer from './components/Canvas/ConnectionLayer';
import TaskDialog from './components/UI/TaskDialog';
import LinkTaskDialog from './components/UI/LinkTaskDialog';
import Sidebar from './components/UI/Sidebar';
import CalendarView from './components/UI/CalendarView';
import SearchBar from './components/UI/SearchBar';
import NotificationCenter from './components/UI/NotificationCenter';
import ToastSystem from './components/UI/ToastSystem';
import MiniTimer from './components/UI/MiniTimer';
import SettingsDialog from './components/UI/SettingsDialog';
import ContextMenu, { ContextMenuType } from './components/UI/ContextMenu';
import CanvasDock from './components/UI/CanvasDock';
import { Plus, Layout, RefreshCw, ZoomIn, ZoomOut, Undo2, Redo2, Bell, Settings, Clipboard, BoxSelect, Loader2, ArrowUpRight, Check } from 'lucide-react';
import { generateId, calculateNextRecurrence } from './utils/dateUtils';
import { audio } from './utils/audioUtils';
import { storage } from './utils/storage';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { performAutoLayout } from './utils/layoutUtils';

const STORAGE_KEY_FIRED = 'chronos-fired-reminders-v1';
const STORAGE_KEY_FIRST_USE = 'chronos-first-use-v1';

interface AppState {
    tasks: Task[];
    groups: Group[];
}

interface FlyingItem {
    id: string;
    type: 'task';
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    delay: number;
}

interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    type: ContextMenuType;
    targetId?: string;
    childId?: string; // For connections
}

const App: React.FC = () => {
  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  
  const [settings, setSettings] = useState<AppSettings>({
      theme: 'light',
      interactionSoundsEnabled: true,
      notificationSound: 'default',
      showGrid: true,
      gridStyle: 'dots',
      revealEnabled: true
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>(SidebarView.INBOX);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const [history, setHistory] = useState<{ past: AppState[]; future: AppState[] }>({ past: [], future: [] });
  const clipboardRef = useRef<{ tasks: Task[] }>({ tasks: [] });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); 

  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  const [connectingParent, setConnectingParent] = useState<Task | undefined>(undefined);
  const [dialogPosition, setDialogPosition] = useState<{x: number, y: number} | undefined>(undefined);
  
  const [dialogOrigin, setDialogOrigin] = useState<{x: number, y: number} | null>(null);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkSourceTask, setLinkSourceTask] = useState<Task | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<'pointer' | 'hand'>('pointer');
  const [quickCapture, setQuickCapture] = useState<{x: number, y: number} | null>(null);

  // New State: Context Menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, type: 'CANVAS' });

  // Refs for Anchoring Animations
  const sidebarBtnRef = useRef<HTMLButtonElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);

  const isInteractionDisabled = isDialogOpen || isLinkDialogOpen || isSidebarOpen || isCalendarOpen || isNotificationCenterOpen || isSettingsOpen || isSearchOpen;

  // --- Effects ---

  useEffect(() => {
      const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const checkDark = () => {
        if (settings.theme === 'dark') return true;
        if (settings.theme === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const isDark = checkDark();
    setIsDarkMode(isDark);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  useEffect(() => {
    const loadData = async () => {
        try {
            await storage.init();
            const [loadedTasks, loadedGroups, loadedSettings, loadedNotifs] = await Promise.all([
                storage.getTasks(),
                storage.getGroups(),
                storage.getSettings(),
                storage.getNotifications()
            ]);
            
            const isFirstUse = !localStorage.getItem(STORAGE_KEY_FIRST_USE);

            if (isFirstUse) {
                 const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                 const welcomeGroup: Group = { id: generateId(), title: "Getting Started", x: center.x - 320, y: center.y - 250, width: 640, height: 500, color: '#3b82f6', locked: true };
                 const t1: Task = { id: generateId(), title: "Welcome to Will! 👋", description: "This is your infinite canvas for tasks. \n\n**Right-click** anywhere to create tasks or groups.\n**Drag** to move things around.", x: center.x - 280, y: center.y - 180, isCompleted: false, checklist: [], tags: ['welcome'], attachments: [], dates: [], dueDate: '', reminderMinutesBefore: 0 };
                 const t2: Task = { id: generateId(), title: "Connections 🔗", description: "Drag from the **dots** on the right of a task to connect it to another. \n\nRight-click a line to remove it.", x: center.x + 20, y: center.y - 100, isCompleted: false, checklist: [], tags: ['tips'], attachments: [], dates: [], dueDate: '', reminderMinutesBefore: 0, parentId: t1.id };
                 const t3: Task = { id: generateId(), title: "Try Context Menus", description: "Right-click this task to see options like **Delete**, **Duplicate**, or **Edit**.", x: center.x - 280, y: center.y + 20, isCompleted: false, checklist: [], tags: [], attachments: [], dates: [], dueDate: '', reminderMinutesBefore: 0 };
                 
                 setTasks([t1, t2, t3]);
                 setGroups([welcomeGroup]);
                 storage.saveGroup(welcomeGroup);
                 [t1, t2, t3].forEach(t => storage.saveTask(t));
                 
                 localStorage.setItem(STORAGE_KEY_FIRST_USE, 'true');
            } else {
                setTasks(loadedTasks);
                setGroups(loadedGroups);
            }
            
            setNotifications(loadedNotifs);
            if (loadedSettings) {
                setSettings(prev => ({ ...prev, ...loadedSettings }));
                audio.setConfig(loadedSettings.interactionSoundsEnabled ?? true, loadedSettings.notificationSound, loadedSettings.customSound?.data);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    loadData();
    const savedFired = localStorage.getItem(STORAGE_KEY_FIRED);
    if (savedFired) try { firedRemindersRef.current = new Set(JSON.parse(savedFired)); } catch(e) {}
    if ('Notification' in window && Notification.permission === 'granted') setHasRequestedPermission(true);
  }, []);
  
  useEffect(() => {
      const handleMouseMoveGlobal = (e: MouseEvent) => {
          document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
          document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
      };
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      return () => window.removeEventListener('mousemove', handleMouseMoveGlobal);
  }, []);

  const handleGlobalInteraction = useCallback(() => {
      if (!hasRequestedPermission && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
          setHasRequestedPermission(true);
      }
  }, [hasRequestedPermission]);

  const pushHistory = useCallback(() => {
    setHistory(curr => ({ past: [...curr.past, { tasks, groups }], future: [] }));
  }, [tasks, groups]);

  const showUndoToast = useCallback((message: string) => {
      const id = generateId();
      const notification: AppNotification = {
          id,
          taskId: 'system',
          title: message,
          message: '',
          timestamp: new Date().toISOString(),
          isRead: true,
          type: 'system',
          actions: [{ label: 'Undo', actionId: 'undo', primary: true }]
      };
      setActiveToasts(prev => [notification, ...prev]);
      // Auto dismiss
      setTimeout(() => {
          setActiveToasts(prev => prev.filter(n => n.id !== id));
      }, 5000);
  }, []);

  const handleTasksUpdate = useCallback((updates: { id: string, x: number, y: number }[]) => {
      setTasks(prev => {
          const map = new Map(updates.map(u => [u.id, u]));
          return prev.map(t => map.has(t.id) ? { ...t, x: map.get(t.id)!.x, y: map.get(t.id)!.y } : t);
      });
  }, []);

  const handleGroupsUpdate = useCallback((updates: { id: string, x: number, y: number }[]) => {
      setGroups(prev => {
          const map = new Map(updates.map(u => [u.id, u]));
          return prev.map(g => map.has(g.id) ? { ...g, x: map.get(g.id)!.x, y: map.get(g.id)!.y } : g);
      });
  }, []);

  const handleGroupResize = useCallback((id: string, width: number, height: number) => {
      setGroups(prev => prev.map(g => g.id === id ? { ...g, width, height } : g));
  }, []);

  // Check for circular dependency
  const hasCycle = (parentId: string, childId: string, allTasks: Task[]): boolean => {
      if (parentId === childId) return true;
      // Walk up from parent
      const parent = allTasks.find(t => t.id === parentId);
      if (!parent || !parent.parentId) return false;
      return hasCycle(parent.parentId, childId, allTasks);
  };

  const handleConnectionMade = useCallback((parentId: string, childId: string) => {
      const child = tasks.find(t => t.id === childId);
      if (child?.parentId === parentId) return; // Already linked
      
      if (hasCycle(parentId, childId, tasks)) {
          audio.play('pop'); 
          return;
      }

      pushHistory();
      setTasks(prev => prev.map(t => t.id === childId ? { ...t, parentId } : t));
      audio.play('success');
      showUndoToast("Connected tasks");
  }, [pushHistory, tasks, showUndoToast]);

  const { 
      interaction, 
      guides,
      handleMouseDown: handleCanvasMouseDown, 
      handleMouseMove, 
      handleMouseUp, 
      handleNodeMouseDown: handleEntityMouseDown,
      handleGroupResizeStart,
      handleConnectionStart,
      handleConnectionEnd,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      screenToCanvas
  } = useCanvasInteraction({
      viewport,
      setViewport,
      scale: viewport.scale,
      tasks,
      groups,
      selectedTaskIds,
      setSelectedTaskIds,
      selectedGroupIds,
      setSelectedGroupIds,
      onTasksUpdate: handleTasksUpdate,
      onGroupsUpdate: handleGroupsUpdate,
      onGroupResize: handleGroupResize,
      pushHistory,
      onConnect: handleConnectionMade,
      interactionMode
  });

  const visibleTasks = useMemo(() => {
      const buffer = 500;
      const minX = -viewport.x / viewport.scale - buffer;
      const minY = -viewport.y / viewport.scale - buffer;
      const maxX = (windowSize.width - viewport.x) / viewport.scale + buffer;
      const maxY = (windowSize.height - viewport.y) / viewport.scale + buffer;
      const flyingIds = new Set(flyingItems.map(f => f.id));
      
      return tasks.filter(t => {
          if (flyingIds.has(t.id)) return false; 
          const tW = 300;
          const tH = t.height || 400;
          if (t.x > maxX || t.x + tW < minX || t.y > maxY || t.y + tH < minY) return false;
          if (!t.isCompleted) return true;
          if (t.recurrence) return true;
          const hasConnections = t.parentId || tasks.some(x => x.parentId === t.id);
          if (hasConnections) {
             return true; 
          }
          return false;
      });
  }, [tasks, flyingItems, viewport, windowSize]);

  // --- Fly Animation Logic ---
  const triggerFlyAnimation = useCallback((task: Task) => {
      // Calculate fly destination (Dock Button or Center)
      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight - 40; 

      if (sidebarBtnRef.current) {
          const rect = sidebarBtnRef.current.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
      }

      const item: FlyingItem = {
          id: task.id,
          type: 'task',
          x: task.x,
          y: task.y,
          w: 300,
          h: task.height || 100,
          title: task.title,
          delay: 0
      };
      
      const enhancedItem = { ...item, targetX, targetY };

      setFlyingItems(prev => [...prev, enhancedItem as any]);
      setTimeout(() => {
          setFlyingItems(prev => prev.filter(i => i.id !== task.id));
      }, 800);
  }, []);

  const handleSaveTaskFull = useCallback(async (updatedTask: Partial<Task>, skipHistory = false) => {
    if (!skipHistory) pushHistory(); 
    setTasks(prev => {
        let newTasks = [...prev];
        const existing = prev.find(t => t.id === updatedTask.id);

        if (updatedTask.id && existing) {
             // Handle Completion Logic
             if (updatedTask.isCompleted && !existing.isCompleted) {
                 
                 // Check if Recurring
                 if (existing.recurrence) {
                     const nextDate = calculateNextRecurrence(existing.dueDate, existing.recurrence);
                     
                     // If there is a next recurrence date
                     if (nextDate) {
                         const newRecurrence = { 
                             ...existing.recurrence, 
                             currentCount: (existing.recurrence.currentCount || 0) + 1 
                         };
                         
                         const nextTask = {
                             ...existing,
                             ...updatedTask,
                             isCompleted: false, // Keep it active
                             dueDate: nextDate,
                             recurrence: newRecurrence,
                             dates: existing.dates.map(d => ({ ...d, date: nextDate })) // Update internal dates if simplistic
                         } as Task;
                         
                         storage.saveTask(nextTask);
                         // Play success sound but don't fly
                         audio.play('success'); 
                         return prev.map(t => t.id === updatedTask.id ? nextTask : t);
                     }
                 }

                 // If not recurring or recurrence ended, do standard fly animation
                 triggerFlyAnimation(existing);
             }
             
             const nextTask = { ...existing, ...updatedTask } as Task;
             storage.saveTask(nextTask);
             newTasks = prev.map(t => t.id === updatedTask.id ? nextTask : t);
        } else {
            const newTask = updatedTask as Task;
            if (!newTask.x) {
                const center = screenToCanvas(window.innerWidth/2, window.innerHeight/2);
                newTask.x = center.x; newTask.y = center.y;
            }
            storage.saveTask(newTask);
            newTasks = [...prev, newTask];
        }
        return newTasks;
    });
  }, [pushHistory, screenToCanvas, triggerFlyAnimation]);

  const undo = useCallback(() => {
    setHistory(curr => {
        if (curr.past.length === 0) return curr;
        const previous = curr.past[curr.past.length - 1];
        const newPast = curr.past.slice(0, -1);
        const newFuture = [{ tasks, groups }, ...curr.future];
        setTasks(previous.tasks);
        setGroups(previous.groups);
        previous.tasks.forEach(t => storage.saveTask(t)); 
        return { past: newPast, future: newFuture };
    });
    audio.play('pop');
  }, [tasks, groups]);

  const redo = useCallback(() => {
    setHistory(curr => {
        if (curr.future.length === 0) return curr;
        const next = curr.future[0];
        const newFuture = curr.future.slice(1);
        const newPast = [...curr.past, { tasks, groups }];
        setTasks(next.tasks);
        setGroups(next.groups);
        return { past: newPast, future: newFuture };
    });
    audio.play('pop');
  }, [tasks, groups]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
      if (interactionMode === 'hand') return;

      const coords = screenToCanvas(e.clientX, e.clientY);
      setQuickCapture({ x: coords.x, y: coords.y });
  }, [screenToCanvas, interactionMode]);

  const commitQuickCapture = (val: string) => {
      if (quickCapture && val.trim()) {
          const newTask: Task = {
              id: generateId(),
              title: val,
              description: '',
              checklist: [],
              tags: [],
              attachments: [],
              dueDate: '',
              reminderMinutesBefore: 0,
              dates: [],
              isCompleted: false,
              x: quickCapture.x,
              y: quickCapture.y,
          };
          handleSaveTaskFull(newTask);
          audio.play('pop');
      }
      setQuickCapture(null);
  };

  // --- Calendar Handlers ---
  const handleCalendarAddTask = useCallback((date: Date) => {
      const center = screenToCanvas(window.innerWidth/2, window.innerHeight/2);
      
      // Use the provided date directly. The CalendarView is responsible for setting specific times
      // (like 9 AM for Month view, or specific hour for Day view).
      const isoDate = date.toISOString();

      setDialogPosition(center);
      setDialogOrigin(null); // Center of screen
      setEditingTask({
          id: generateId(),
          title: '',
          dueDate: isoDate,
          dates: [{ id: generateId(), date: isoDate, reminderMinutes: 15 }]
      });
      setIsDialogOpen(true);
  }, [screenToCanvas]);

  // --- Undo/Redo/Delete Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isInteractionDisabled || quickCapture) return;
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
          
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedTaskIds.size > 0 || selectedGroupIds.size > 0) {
                  e.preventDefault();
                  pushHistory();
                  const taskIds = Array.from(selectedTaskIds);
                  const groupIds = Array.from(selectedGroupIds);
                  
                  if (taskIds.length > 0) {
                      setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
                      storage.deleteTasks(taskIds);
                  }
                  if (groupIds.length > 0) {
                      setGroups(prev => prev.filter(g => !selectedGroupIds.has(g.id)));
                      groupIds.forEach(id => storage.deleteGroup(id));
                  }
                  
                  setSelectedTaskIds(new Set());
                  setSelectedGroupIds(new Set());
                  audio.play('pop');
                  showUndoToast(taskIds.length > 0 ? "Deleted tasks" : "Deleted groups");
              }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); setSelectedTaskIds(new Set(tasks.map(t => t.id))); }
          if (e.key === 'Escape') {
              setSelectedTaskIds(new Set());
              setSelectedGroupIds(new Set());
              setIsLinkDialogOpen(false);
              setContextMenu(prev => ({ ...prev, isOpen: false }));
              setQuickCapture(null);
              setIsSearchOpen(false);
              setIsCalendarOpen(false);
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, groups, selectedTaskIds, selectedGroupIds, isInteractionDisabled, undo, redo, pushHistory, showUndoToast, quickCapture]);

  const handleToastAction = (notification: AppNotification, actionId: string) => {
      setActiveToasts(prev => prev.filter(t => t.id !== notification.id));
      if (actionId === 'undo') { undo(); return; }
      const task = tasks.find(t => t.id === notification.taskId);
      if (!task) return;
      if (actionId === 'complete') { handleSaveTaskFull({ id: task.id, isCompleted: true }); audio.play('success'); }
      storage.saveNotification({ ...notification, isRead: true });
  };
  
  const handleContextMenu = (e: React.MouseEvent, type: ContextMenuType, targetId?: string, childId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, type, targetId, childId });
  };

  const handleContextMenuAction = (action: string, targetId?: string) => {
      setContextMenu(prev => ({ ...prev, isOpen: false }));
      switch(action) {
          case 'delete':
              if (targetId) {
                  pushHistory();
                  if (contextMenu.type === 'TASK') {
                      setTasks(prev => prev.filter(t => t.id !== targetId));
                      storage.deleteTasks([targetId]);
                  } else {
                      const group = groups.find(g => g.id === targetId);
                      if (group) {
                          const tasksInGroup = tasks.filter(t => t.x >= group.x && t.x <= group.x + group.width && t.y >= group.y && t.y <= group.y + group.height);
                          const taskIds = tasksInGroup.map(t => t.id);
                          setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
                          storage.deleteTasks(taskIds);
                      }
                      setGroups(prev => prev.filter(g => g.id !== targetId));
                      storage.deleteGroup(targetId);
                  }
                  audio.play('pop');
                  showUndoToast("Deleted item");
              }
              break;
          case 'delete_connection':
              if (contextMenu.childId) {
                  pushHistory();
                  setTasks(prev => prev.map(t => t.id === contextMenu.childId ? { ...t, parentId: undefined } : t));
                  audio.play('click');
                  showUndoToast("Removed connection");
              }
              break;
          case 'ungroup':
              if (targetId) {
                  pushHistory();
                  setGroups(prev => prev.filter(g => g.id !== targetId));
                  storage.deleteGroup(targetId);
                  audio.play('click');
                  showUndoToast("Ungrouped");
              }
              break;
          case 'duplicate':
              if (targetId) {
                  pushHistory();
                  const original = tasks.find(t => t.id === targetId);
                  if (original) {
                      const newTask = { ...original, id: generateId(), x: original.x + 20, y: original.y + 20, title: `${original.title} (Copy)` };
                      setTasks(prev => [...prev, newTask]);
                      storage.saveTask(newTask);
                      showUndoToast("Duplicated task");
                  }
              }
              break;
          case 'unlink':
              if (targetId) {
                  pushHistory();
                  setTasks(prev => prev.map(t => t.id === targetId ? { ...t, parentId: undefined } : t));
                  showUndoToast("Disconnected");
              }
              break;
          case 'edit':
              if (targetId) {
                  const t = tasks.find(x => x.id === targetId);
                  if (t) { setEditingTask(t); setIsDialogOpen(true); }
              }
              break;
          case 'new_task':
              const coords = screenToCanvas(contextMenu.x, contextMenu.y);
              setDialogPosition(coords);
              setEditingTask(undefined);
              setIsDialogOpen(true);
              break;
          case 'new_group':
              const gCoords = screenToCanvas(contextMenu.x, contextMenu.y);
              const newGroup: Group = {
                  id: generateId(),
                  title: 'New Group',
                  x: gCoords.x,
                  y: gCoords.y,
                  width: 400,
                  height: 300,
                  color: '#94a3b8',
                  locked: false
              };
              setGroups(prev => [...prev, newGroup]);
              storage.saveGroup(newGroup);
              pushHistory();
              break;
          case 'layout':
              pushHistory();
              const updates = performAutoLayout(tasks, selectedTaskIds);
              handleTasksUpdate(updates);
              updates.forEach(u => { const t = tasks.find(k => k.id === u.id); if(t) storage.saveTask({ ...t, x: u.x, y: u.y }); });
              audio.play('pop');
              showUndoToast("Auto-arranged layout");
              break;
          case 'paste':
               if (clipboardRef.current.tasks.length > 0) {
                    pushHistory();
                    const center = screenToCanvas(contextMenu.x, contextMenu.y);
                    const firstX = clipboardRef.current.tasks[0].x; 
                    const firstY = clipboardRef.current.tasks[0].y;
                    const offsetX = center.x - firstX; 
                    const offsetY = center.y - firstY;
                    const newTasks = clipboardRef.current.tasks.map(t => ({...t, id: generateId(), x: t.x + offsetX, y: t.y + offsetY, parentId: undefined}));
                    setTasks(prev => [...prev, ...newTasks]);
                    newTasks.forEach(t => storage.saveTask(t));
                    showUndoToast("Pasted tasks");
               }
              break;
      }
  };

  const handleUpdateGroup = useCallback((updatedGroup: Group) => {
      pushHistory();
      setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      storage.saveGroup(updatedGroup);
  }, [pushHistory]);
  
  const handleWheel = (e: React.WheelEvent) => {
    if (isInteractionDisabled) return;
    if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(viewport.scale + delta, 0.2), 3);
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const scaleRatio = newScale / viewport.scale;
        const newX = mouseX - (mouseX - viewport.x) * scaleRatio;
        const newY = mouseY - (mouseY - viewport.y) * scaleRatio;
        setViewport({ x: newX, y: newY, scale: newScale });
    } else {
        setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY, }));
    }
  };

  const getElementOrigin = (ref: React.RefObject<HTMLElement>) => {
      if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return null;
  };

  if (isLoading) return <div className="w-full h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div 
        className="w-full h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden relative select-none" 
        onContextMenu={(e) => handleContextMenu(e, 'CANVAS')}
        onWheel={handleWheel}
        tabIndex={0}
        style={{ outline: 'none' }}
    >
      
      <ToastSystem notifications={activeToasts} onDismiss={(id) => setActiveToasts(p => p.filter(t => t.id !== id))} onAction={handleToastAction} />
      
      <SearchBar 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        tasks={tasks} 
        onSelectTask={(id) => { 
            const t = tasks.find(x => x.id === id); 
            if(t) {
                const w = window.innerWidth; const h = window.innerHeight;
                setViewport({ x: -t.x * viewport.scale + w/2 - 150*viewport.scale, y: -t.y * viewport.scale + h/2 - 75*viewport.scale, scale: viewport.scale });
                setSelectedTaskIds(new Set([id]));
            }
        }} 
      />

      <CanvasDock 
        scale={viewport.scale}
        mode={interactionMode}
        isSidebarOpen={isSidebarOpen}
        isCalendarOpen={isCalendarOpen}
        onSetMode={setInteractionMode}
        onZoomIn={() => setViewport(v => ({ ...v, scale: Math.min(v.scale + 0.2, 3) }))}
        onZoomOut={() => setViewport(v => ({ ...v, scale: Math.max(v.scale - 0.2, 0.2) }))}
        onFitContent={() => {
            if (tasks.length === 0) return;
            const minX = Math.min(...tasks.map(t => t.x));
            const maxX = Math.max(...tasks.map(t => t.x + (t.width || 300)));
            const minY = Math.min(...tasks.map(t => t.y));
            const maxY = Math.max(...tasks.map(t => t.y + (t.height || 100)));
            
            const w = maxX - minX + 200;
            const h = maxY - minY + 200;
            const scaleW = window.innerWidth / w;
            const scaleH = window.innerHeight / h;
            const newScale = Math.min(Math.min(scaleW, scaleH), 1);
            
            setViewport({
                x: (window.innerWidth - w * newScale) / 2 - minX * newScale + 100 * newScale,
                y: (window.innerHeight - h * newScale) / 2 - minY * newScale + 100 * newScale,
                scale: newScale
            });
        }}
        onToggleSidebar={() => { handleGlobalInteraction(); setIsSidebarOpen(!isSidebarOpen); if(!isSidebarOpen) setSidebarView(SidebarView.INBOX); }}
        onToggleCalendar={() => { handleGlobalInteraction(); setIsCalendarOpen(!isCalendarOpen); }}
        onOpenSearch={() => { handleGlobalInteraction(); setIsSearchOpen(true); }}
        onCreateNew={(e) => { 
             const center = screenToCanvas(window.innerWidth/2, window.innerHeight/2);
             setDialogPosition(center);
             setDialogOrigin({ x: e.clientX, y: e.clientY });
             setEditingTask(undefined);
             setIsDialogOpen(true);
        }}
        sidebarButtonRef={sidebarBtnRef}
        calendarButtonRef={calendarBtnRef}
      />

      {isSidebarOpen && (
          <Sidebar 
            currentView={sidebarView} 
            tasks={tasks} 
            onChangeView={setSidebarView} 
            onClose={() => setIsSidebarOpen(false)} 
            onSelectTask={(id) => { 
                const t = tasks.find(x => x.id === id); 
                if(t) {
                    const w = window.innerWidth; const h = window.innerHeight;
                    setViewport({ x: -t.x * viewport.scale + w/2 - 150*viewport.scale, y: -t.y * viewport.scale + h/2 - 75*viewport.scale, scale: viewport.scale });
                    setSelectedTaskIds(new Set([id]));
                    setIsSidebarOpen(false);
                }
            }} 
            onEditTask={(t, e) => { setEditingTask(t); setIsDialogOpen(true); }} 
            onUpdateTask={handleSaveTaskFull} 
            selectedTag={selectedTag} 
            onSelectTag={setSelectedTag}
            origin={getElementOrigin(sidebarBtnRef)}
          />
      )}

      {isCalendarOpen && (
          <CalendarView 
            isOpen={isCalendarOpen} 
            onClose={() => setIsCalendarOpen(false)} 
            tasks={tasks}
            origin={getElementOrigin(calendarBtnRef)}
            onAddTask={handleCalendarAddTask}
            onEditTask={(t) => { setEditingTask(t); setIsDialogOpen(true); }}
          />
      )}
      
      <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} notifications={notifications} onMarkAsRead={(id) => { storage.saveNotification(notifications.find(n => n.id === id)!); setNotifications(p => p.map(n => n.id === id ? {...n, isRead:true} : n)); }} onMarkAllAsRead={() => { notifications.forEach(n => storage.saveNotification({...n, isRead:true})); setNotifications(p => p.map(n => ({...n, isRead:true}))); }} onClearAll={() => { storage.clearNotifications(); setNotifications([]); }} onDismiss={(id) => { storage.deleteNotification(id); setNotifications(p => p.filter(n => n.id !== id)); }} onSelectTask={(id) => { /* center */ }} />
      
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={(s) => { setSettings(s); storage.saveSettings(s); }} onResetData={async () => { await storage.deleteTasks(tasks.map(t => t.id)); setTasks([]); setGroups([]); await storage.clearNotifications(); setNotifications([]); }} />

      {/* Right Toolbar - Repositioned */}
      <div className="absolute top-4 right-4 z-30 flex gap-4 items-start pointer-events-none">
          <div className="flex flex-col gap-2 items-end pointer-events-auto">
            {tasks.filter(t => t.timerState?.isRunning).map(task => <MiniTimer key={task.id} task={task} onUpdate={handleSaveTaskFull} onStop={() => handleSaveTaskFull({ id: task.id, timerState: { ...task.timerState!, isRunning: false } })} />)}
          </div>
          <div className="flex flex-col gap-3 pointer-events-auto items-end">
            <button onClick={() => { handleGlobalInteraction(); setIsSettingsOpen(true); }} className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"><Settings size={20} /></button>
            <button onClick={() => { handleGlobalInteraction(); setIsNotificationCenterOpen(true); }} className={`w-12 h-12 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative ${notifications.filter(n => !n.isRead).length > 0 ? 'animate-pulseSoft' : ''}`}><Bell size={20} /></button>
          </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        className={`relative w-full h-full z-0 ${interactionMode === 'hand' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
        }}
      >
          {/* Grid with Opacity Fade for Zoom */}
          {settings.showGrid && (
             <div className="absolute inset-[-5000px] pointer-events-none z-[-1]" style={{ 
                 backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
                 opacity: viewport.scale < 0.4 ? 0 : 0.15, // Hide grid when zoomed out to prevent grey wash
                 backgroundImage: settings.gridStyle === 'lines' 
                     ? `linear-gradient(to right, ${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(to bottom, ${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px)`
                     : settings.gridStyle === 'dots'
                         ? `radial-gradient(${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px)`
                         : `conic-gradient(from 90deg at 1px 1px, transparent 90deg, ${isDarkMode ? '#fff' : '#000'} 0)`
             }} />
          )}

          <ConnectionLayer 
            tasks={tasks} 
            viewport={viewport} 
            windowSize={windowSize} 
            onContextMenu={(e, pId, cId) => handleContextMenu(e, 'CONNECTION', undefined, cId)} 
          />

          {groups.map(group => (
              <GroupNode
                  key={group.id}
                  group={group}
                  isSelected={selectedGroupIds.has(group.id)}
                  onUpdate={handleUpdateGroup}
                  onDelete={(id) => { setGroups(g => g.filter(x => x.id !== id)); storage.deleteGroup(id); pushHistory(); }}
                  onMouseDown={(e) => handleEntityMouseDown(e, group.id, 'group')}
                  onResizeStart={(e) => handleGroupResizeStart(e, group.id)}
                  onDoubleClick={() => { /* maybe zoom to group? */ }}
                  onContextMenu={(e, g) => handleContextMenu(e, 'GROUP', g.id)}
              />
          ))}

          {visibleTasks.map(task => (
              <TaskNode
                  key={task.id}
                  task={task}
                  hasChildren={tasks.some(t => t.parentId === task.id)}
                  sequenceIndex={task.parentId ? tasks.filter(t => t.parentId === task.parentId).sort((a,b) => (a.y - b.y)).findIndex(t => t.id === task.id) + 1 : undefined}
                  isSelected={selectedTaskIds.has(task.id)}
                  onSelect={(id) => { setSelectedTaskIds(new Set([id])); setSelectedGroupIds(new Set()); }}
                  onUpdate={handleSaveTaskFull}
                  onDelete={(id) => { setTasks(prev => prev.filter(t => t.id !== id)); storage.deleteTasks([id]); pushHistory(); }}
                  onConnectStart={(t, e) => handleConnectionStart(e, t.id)}
                  onLinkStart={(t) => { setLinkSourceTask(t); setIsLinkDialogOpen(true); }}
                  onEdit={(t, e) => { setEditingTask(t); setDialogPosition(undefined); setIsDialogOpen(true); }}
                  onDoubleClick={(t) => { setEditingTask(t); setIsDialogOpen(true); }}
                  onContextMenu={(e, t) => handleContextMenu(e, 'TASK', t.id)}
                  onConnectionDragStart={(e, id) => handleConnectionStart(e, id)}
                  onConnectionDrop={(e, id) => handleConnectionEnd(e, id)}
                  onMouseDown={(e) => handleEntityMouseDown(e, task.id, 'task')}
                  style={{}}
              />
          ))}

          {quickCapture && (
              <div 
                className="absolute z-[200] w-[300px]"
                style={{ left: quickCapture.x, top: quickCapture.y }}
              >
                  <input
                    autoFocus
                    placeholder="New Task..."
                    className="w-full bg-white dark:bg-slate-800 shadow-xl rounded-xl p-4 text-[15px] font-bold outline-none ring-2 ring-blue-500 text-slate-800 dark:text-white animate-scaleIn"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            commitQuickCapture(e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                            setQuickCapture(null);
                        }
                    }}
                    onBlur={(e) => {
                        commitQuickCapture(e.target.value);
                    }}
                  />
                  <div className="mt-2 text-[10px] bg-slate-900/80 text-white px-2 py-1 rounded inline-block backdrop-blur-sm animate-fadeIn">
                      Press Enter to save
                  </div>
              </div>
          )}

          {flyingItems.map(item => (
              <div 
                key={item.id} 
                className="absolute z-[100] pointer-events-none bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-blue-500/50 flex items-center p-4 gap-3 animate-flyToLog"
                style={{
                    left: item.x, top: item.y, width: item.w, height: 80,
                    animationDuration: '0.8s',
                    ['--target-x' as any]: `${(item as any).targetX ? ((item as any).targetX - item.x - (item.w / 2)) : ((window.innerWidth / 2) - item.x - (item.w / 2))}px`,
                    ['--target-y' as any]: `${(item as any).targetY ? ((item as any).targetY - item.y) : ((window.innerHeight - 40) - item.y)}px`,
                }}
              >
                 <div className="w-5 h-5 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                 </div>
                 <span className="font-bold text-slate-800 dark:text-white line-through opacity-50">{item.title}</span>
              </div>
          ))}

          {interaction.type === 'connecting' && (
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-50">
                  <path 
                    d={`M ${interaction.startX/viewport.scale - viewport.x/viewport.scale} ${interaction.startY/viewport.scale - viewport.y/viewport.scale} L ${interaction.currentX/viewport.scale - viewport.x/viewport.scale} ${interaction.currentY/viewport.scale - viewport.y/viewport.scale}`} 
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                    strokeDasharray="5,5" 
                  />
              </svg>
          )}

          {interaction.type === 'selecting' && (
             <div 
                className="absolute bg-blue-500/10 border border-blue-500/50 z-50 pointer-events-none"
                style={{
                    left: Math.min((interaction.startX - viewport.x)/viewport.scale, (interaction.currentX - viewport.x)/viewport.scale),
                    top: Math.min((interaction.startY - viewport.y)/viewport.scale, (interaction.currentY - viewport.y)/viewport.scale),
                    width: Math.abs(interaction.currentX - interaction.startX)/viewport.scale,
                    height: Math.abs(interaction.currentY - interaction.startY)/viewport.scale
                }}
             />
          )}

           {guides.map((g, i) => (
               <div 
                 key={i}
                 className={`absolute bg-red-500 z-50 pointer-events-none ${g.type === 'vertical' ? 'w-px h-screen -top-1/2' : 'h-px w-screen -left-1/2'}`}
                 style={{
                     left: g.type === 'vertical' ? g.pos : undefined,
                     top: g.type === 'horizontal' ? g.pos : undefined
                 }}
               />
           ))}

      </div>

      {settings.revealEnabled && (
        <div 
            className="pointer-events-none fixed inset-0 z-50 mix-blend-screen opacity-50"
            style={{
                background: `radial-gradient(600px circle at var(--cursor-x) var(--cursor-y), rgba(59, 130, 246, 0.15), transparent 40%)`
            }}
        />
      )}

      <TaskDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSave={handleSaveTaskFull} 
        initialData={editingTask} 
        origin={dialogOrigin}
      />
      
      <LinkTaskDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onSelect={(targetId) => { if(linkSourceTask) handleConnectionMade(targetId, linkSourceTask.id); setIsLinkDialogOpen(false); }}
        tasks={tasks}
        sourceTaskId={linkSourceTask?.id || null}
      />
      
      {contextMenu.isOpen && (
          <ContextMenu 
            {...contextMenu} 
            onClose={() => setContextMenu(p => ({ ...p, isOpen: false }))} 
            onAction={handleContextMenuAction} 
          />
      )}

    </div>
  );
};

export default App;