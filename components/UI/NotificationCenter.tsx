import React from 'react';
import { AppNotification } from '../../types';
import { X, Bell, Check, Clock, AlertCircle, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onSelectTask: (taskId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDismiss,
  onSelectTask
}) => {
  const [permission, setPermission] = React.useState<NotificationPermission>(
     typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = () => {
      if ('Notification' in window) {
          Notification.requestPermission().then((perm) => {
              setPermission(perm);
          });
      }
  };

  if (!isOpen) return null;

  // Sort: Unread first, then new to old
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isRead === b.isRead) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return a.isRead ? 1 : -1;
  });

  return (
    <div className="fixed inset-0 z-[60] flex pointer-events-none">
       {/* Backdrop */}
       <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
       />

       {/* Panel */}
       <div className="absolute top-20 right-6 w-full max-w-sm pointer-events-auto flex flex-col max-h-[calc(100vh-6rem)] animate-slideRight origin-top-right">
           {/* Card Container */}
           <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 flex flex-col overflow-hidden ring-1 ring-slate-900/5 dark:ring-black/20 h-full">
               
               {/* Header */}
               <div className="px-5 py-4 border-b border-slate-100/50 dark:border-slate-700/50 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                   <div className="flex items-center gap-2.5">
                       <div className="relative">
                           <Bell size={20} className="text-slate-700 dark:text-slate-200" />
                           {notifications.some(n => !n.isRead) && (
                               <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800" />
                           )}
                       </div>
                       <h3 className="font-bold text-slate-800 dark:text-white text-lg">Notifications</h3>
                   </div>
                   <div className="flex gap-1">
                        {notifications.length > 0 && (
                            <button 
                                onClick={onClearAll}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                title="Clear All"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                   </div>
               </div>
               
               {/* Permission Warning */}
               {permission !== 'granted' && (
                   <div className={`px-5 py-3 border-b flex items-start gap-3 
                        ${permission === 'denied' 
                            ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/50' 
                            : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50'
                        }
                   `}>
                       {permission === 'denied' 
                            ? <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"/> 
                            : <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                       }
                       <div className="flex-1">
                           <p className={`text-xs font-bold ${permission === 'denied' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                               {permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
                           </p>
                           <p className={`text-[10px] leading-snug mt-0.5 mb-2 ${permission === 'denied' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                               {permission === 'denied' 
                                 ? 'You must enable notifications in your browser settings to receive alerts.' 
                                 : 'Enable browser notifications to receive task reminders.'}
                           </p>
                           {permission === 'default' && (
                               <button onClick={requestPermission} className="text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors shadow-sm">
                                   Enable Now
                               </button>
                           )}
                       </div>
                   </div>
               )}

               {/* Toolbar */}
               {notifications.length > 0 && (
                   <div className="px-5 py-2 flex justify-end border-b border-slate-100/50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-700/30">
                       <button 
                        onClick={onMarkAllAsRead}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                       >
                           <Check size={12} /> Mark all as read
                       </button>
                   </div>
               )}

               {/* List */}
               <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                   {sortedNotifications.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 opacity-60">
                           <Bell size={48} strokeWidth={1} className="mb-3" />
                           <p className="text-sm font-medium">No new notifications</p>
                       </div>
                   ) : (
                       sortedNotifications.map(notification => (
                           <div 
                                key={notification.id}
                                className={`
                                    relative p-4 rounded-2xl transition-all border group pr-8
                                    ${notification.isRead 
                                        ? 'bg-white/40 dark:bg-slate-800/40 border-transparent hover:bg-white/80 dark:hover:bg-slate-800/80' 
                                        : 'bg-white dark:bg-slate-700 border-blue-100 dark:border-blue-900 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800'
                                    }
                                `}
                           >
                               <div 
                                    className="cursor-pointer"
                                    onClick={() => {
                                        onMarkAsRead(notification.id);
                                        onSelectTask(notification.taskId);
                                        onClose();
                                    }}
                               >
                                   {!notification.isRead && (
                                       <div className="absolute top-4 right-8 w-2 h-2 bg-blue-500 rounded-full" />
                                   )}
                                   
                                   <div className="flex items-start gap-3">
                                       <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 
                                            ${notification.type === 'overdue' 
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                            }
                                       `}>
                                           {notification.type === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                       </div>
                                       <div className="min-w-0 flex-1">
                                           <h4 className={`text-sm font-bold mb-0.5 truncate ${notification.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                               {notification.title}
                                           </h4>
                                           <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                               {notification.message}
                                           </p>
                                           <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                                               {formatDate(notification.timestamp)}
                                           </p>
                                       </div>
                                   </div>
                               </div>

                               {/* Dismiss Button */}
                               <button 
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       onDismiss(notification.id);
                                   }}
                                   className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                   title="Dismiss"
                               >
                                   <X size={14} />
                               </button>
                           </div>
                       ))
                   )}
               </div>

           </div>
       </div>
    </div>
  );
};

export default NotificationCenter;