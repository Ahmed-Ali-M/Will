
import { RecurrenceConfig } from "../types";

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return '';
  }
};

export const isSameDay = (d1: Date, d2: Date) => {
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const getRelativeDateLabel = (dateString: string) => {
  if (!dateString) return 'No Date';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'No Date';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return formatDate(dateString);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getRecurrenceText = (config: RecurrenceConfig): string => {
    const parts: string[] = [];
    const intervalStr = config.interval > 1 ? `every ${config.interval}` : 'every';

    if (config.type === 'DAILY') {
        parts.push(config.interval > 1 ? `${intervalStr} days` : 'Daily');
    } else if (config.type === 'WEEKLY') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selected = (config.weekDays || []).sort().map(d => days[d]).join(', ');
        parts.push(`${intervalStr} week${config.interval > 1 ? 's' : ''}${selected ? ' on ' + selected : ''}`);
    } else if (config.type === 'MONTHLY') {
        if (config.monthType === 'RELATIVE') {
             const nth = config.monthWeekNum === 1 ? '1st' : config.monthWeekNum === 2 ? '2nd' : config.monthWeekNum === 3 ? '3rd' : config.monthWeekNum === 4 ? '4th' : 'last';
             const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
             const day = days[config.monthWeekDay ?? 0];
             parts.push(`${intervalStr} month${config.interval > 1 ? 's' : ''} on the ${nth} ${day}`);
        } else {
             parts.push(`${intervalStr} month${config.interval > 1 ? 's' : ''} on day ${config.monthDay}`);
        }
    } else {
        parts.push(config.interval > 1 ? `${intervalStr} years` : 'Yearly');
    }

    if (config.endType === 'COUNT' && config.endCount) {
        parts.push(`, ${config.endCount - (config.currentCount || 0)} times left`);
    } else if (config.endType === 'DATE' && config.endDate) {
        parts.push(`, until ${new Date(config.endDate).toLocaleDateString()}`);
    }

    return parts.join('');
};

export const calculateNextRecurrence = (currentDateStr: string, config: RecurrenceConfig): string | null => {
  // 1. Check End Conditions
  if (config.endType === 'COUNT' && config.endCount) {
      const currentCount = config.currentCount || 0;
      if (currentCount >= config.endCount - 1) return null; // -1 because we are calculating the *next* one
  }

  const currentDue = new Date(currentDateStr);
  if (isNaN(currentDue.getTime())) return new Date().toISOString();
  
  if (config.endType === 'DATE' && config.endDate) {
      const end = new Date(config.endDate);
      // If current is already past end date, stop
      if (currentDue.getTime() > end.getTime()) return null; 
  }

  let nextDate = new Date(currentDue);
  
  // Helper to reset time if needed, though we try to preserve currentDue time usually
  // unless config.time is set
  const setConfigTime = (d: Date) => {
      if (config.time) {
          const [h, m] = config.time.split(':').map(Number);
          d.setHours(h, m, 0, 0);
      } else {
          d.setHours(currentDue.getHours(), currentDue.getMinutes(), 0, 0);
      }
      return d;
  };

  switch (config.type) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + config.interval);
      break;

    case 'WEEKLY': {
        // Complex logic: Check if there is another day in *this* week pattern that is in the future relative to currentDue
        // If not, jump 'interval' weeks and find the first day of that week.
        
        const weekDays = (config.weekDays || []).sort((a, b) => a - b);
        if (weekDays.length === 0) {
            nextDate.setDate(nextDate.getDate() + (7 * config.interval));
        } else {
            const currentDayOfWeek = currentDue.getDay(); // 0-6
            
            // Find a day in the current week list that is > currentDayOfWeek
            const nextDayInWeek = weekDays.find(d => d > currentDayOfWeek);
            
            if (nextDayInWeek !== undefined) {
                // Same week, just move to that day
                const diff = nextDayInWeek - currentDayOfWeek;
                nextDate.setDate(nextDate.getDate() + diff);
            } else {
                // Must move to next eligible interval
                // Add interval weeks
                nextDate.setDate(nextDate.getDate() + (7 * config.interval));
                
                // Set to the first day in the list for that week
                // We need to calculate how far back or forward to go to hit the first requested day
                // Current is 'currentDayOfWeek'. We added 7*interval. 
                // We want to land on weekDays[0].
                const firstDay = weekDays[0];
                // Go to start of that week (assuming Sun start) -> subtract currentDay
                const daysToSunday = -nextDate.getDay();
                nextDate.setDate(nextDate.getDate() + daysToSunday + firstDay);
            }
        }
        break;
    }

    case 'MONTHLY': {
        nextDate.setMonth(nextDate.getMonth() + config.interval);
        
        if (config.monthType === 'RELATIVE' && config.monthWeekNum && config.monthWeekDay !== undefined) {
             // e.g. 2nd Tuesday
             // Go to 1st of the target month
             nextDate.setDate(1);
             
             const targetDay = config.monthWeekDay; // 0-6
             const nth = config.monthWeekNum; // 1-4, or -1 for last
             
             if (nth === -1) {
                 // Find last occurrence
                 // Go to next month 1st, subtract 1 day to get last day of target month
                 nextDate.setMonth(nextDate.getMonth() + 1);
                 nextDate.setDate(0);
                 // Backtrack to targetDay
                 while (nextDate.getDay() !== targetDay) {
                     nextDate.setDate(nextDate.getDate() - 1);
                 }
             } else {
                 // Find 1st occurrence
                 while (nextDate.getDay() !== targetDay) {
                     nextDate.setDate(nextDate.getDate() + 1);
                 }
                 // Add (n-1) weeks
                 nextDate.setDate(nextDate.getDate() + (7 * (nth - 1)));
             }

        } else {
            // Standard Date (e.g. 15th)
            // Handle month overflow (Jan 31 + 1 month -> Feb 28/29)
            const desiredDay = config.monthDay || currentDue.getDate();
            
            // Reset to 1st to avoid auto-overflow logic of setMonth
            // Actually setMonth handles overflow by pushing into next month (Feb 30 -> Mar 2)
            // We want to clamp.
            // Approach: Set to 1st of target month, check max days, clamp.
            const targetMonth = nextDate.getMonth(); // Already added interval
            const year = nextDate.getFullYear();
            const daysInMonth = new Date(year, targetMonth + 1, 0).getDate();
            const actualDay = Math.min(desiredDay, daysInMonth);
            
            nextDate.setDate(actualDay);
        }
        break;
    }

    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + config.interval);
      break;
  }

  nextDate = setConfigTime(nextDate);

  // Final check: If calculated next date is after end date, return null
  if (config.endType === 'DATE' && config.endDate) {
      if (nextDate.getTime() > new Date(config.endDate).getTime()) {
          return null;
      }
  }

  return nextDate.toISOString();
};