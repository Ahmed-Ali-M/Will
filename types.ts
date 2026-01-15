

export interface ChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
  type?: 'bullet' | 'ordered';
}

export interface TaskDate {
  id: string;
  date: string; // ISO string
  reminderMinutes: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string;
  showPreview: boolean;
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
}

export interface RecurrenceConfig {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number; // e.g. every 2 days
  
  // Weekly specific
  weekDays?: number[]; // 0 (Sun) - 6 (Sat)
  
  // Monthly specific
  monthType?: 'DATE' | 'RELATIVE'; // On the 15th vs On the 2nd Friday
  monthDay?: number; // 1-31
  monthWeekNum?: number; // 1 (1st), 2 (2nd), 3 (3rd), 4 (4th), -1 (Last)
  monthWeekDay?: number; // 0-6 (Day of week for relative)

  // End conditions
  endType?: 'NEVER' | 'DATE' | 'COUNT';
  endDate?: string; // ISO Date
  endCount?: number; // Total occurrences desired
  currentCount?: number; // How many times it has recurred so far

  time?: string; // "HH:MM" override
}

export interface Task {
  id: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  tags: string[];
  attachments: Attachment[];
  
  dueDate: string; 
  reminderMinutesBefore: number;
  dates: TaskDate[]; 
  
  durationMinutes?: number;
  timerState?: TimerState;

  // Updated Recurrence
  recurrence?: RecurrenceConfig; 
  lastCompletedDate?: string;

  isCompleted: boolean;
  x: number;
  y: number;
  width?: number; // Optional custom width (future proofing)
  height?: number; // Custom height for vertical resize
  parentId?: string;
}

export interface Group {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  color: string;
  locked: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export enum SidebarView {
  HIDDEN = 'HIDDEN',
  INBOX = 'INBOX',
  TODAY = 'TODAY',
  TOMORROW = 'TOMORROW',
  UPCOMING = 'UPCOMING',
  SOMETIME = 'SOMETIME',
  LOG = 'LOG',
  TAG = 'TAG',
}

export interface NotificationAction {
  label: string;
  actionId: 'snooze' | 'complete' | 'start-timer' | 'dismiss' | 'undo';
  primary?: boolean;
}

export interface AppNotification {
  id: string;
  taskId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'reminder' | 'overdue' | 'system';
  actions?: NotificationAction[];
}

export interface CustomSound {
  name: string;
  data: string; // Base64
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  
  // Audio
  interactionSoundsEnabled: boolean; // Only for feedback (clicks, pops)
  
  // Notification Tones
  notificationSound: string; // ID of the sound
  customSound?: CustomSound | null;
  
  // Grid
  showGrid: boolean;
  gridStyle: 'dots' | 'lines' | 'crosshairs';

  // Reveal Effect (Starfield)
  revealEnabled: boolean;
}